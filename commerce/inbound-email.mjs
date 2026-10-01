import { Resolver } from 'node:dns/promises';

function txtRecordValue(value) {
  return String(value || '').replace(/^"|"$/g, '').replace(/"\s*"/g, '');
}

async function dohResolve(name, type) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const response = await fetch(url, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`DNS-over-HTTPS returned ${response.status}`);
  const body = await response.json();
  if (body?.Status && body.Status !== 0) throw new Error(`DNS-over-HTTPS status ${body.Status}`);
  return (body?.Answer || []).map((answer) => type === 'TXT' ? txtRecordValue(answer.data) : answer.data).filter(Boolean);
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function addressValue(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const email = stringValue(value.Email || value.email);
  const name = stringValue(value.Name || value.name);
  return email ? (name ? `${name} <${email}>` : email) : '';
}

function listAddresses(value) {
  if (Array.isArray(value)) return value.map(addressValue).filter(Boolean).join(', ');
  return addressValue(value);
}

function headerValue(headers, name) {
  return headerValues(headers, name)[0] || '';
}

function headerValues(headers, name) {
  if (!Array.isArray(headers)) return [];
  const wanted = name.toLowerCase();
  return headers
    .filter((header) => stringValue(header?.Name || header?.name).toLowerCase() === wanted)
    .map((header) => header?.Value || header?.value)
    .map(stringValue)
    .filter(Boolean);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Postmark can omit RawEmail even when its raw-email option is enabled. In
// that case, accept only a provider-authenticated payload that still carries
// the original NayaPay DKIM/DMARC results. HTTP Basic Auth protects the
// payload transport; these checks keep arbitrary authenticated JSON from
// being treated as a receipt.
function authenticatePostmarkPayload(payload, sender, fallback, options = {}) {
  const expected = stringValue(sender).toLowerCase();
  const from = stringValue(payload?.FromFull?.Email || payload?.fromFull?.Email || payload?.From || payload?.from)
    .match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
    ?.toLowerCase() || '';
  const domain = String(options.signingDomain || expected.split('@')[1] || '').trim().toLowerCase();
  if (!expected || !domain || from !== expected) return null;

  const authResults = [
    ...headerValues(payload.Headers || payload.headers, 'authentication-results'),
    ...headerValues(payload.Headers || payload.headers, 'arc-authentication-results'),
  ].join(' ');
  const dkimSignatures = headerValues(payload.Headers || payload.headers, 'dkim-signature').join(' ');
  const domainPattern = escapeRegExp(domain);
  const dkimPassed = new RegExp(`\\bdkim=pass\\b[^;\\r\\n]*\\bheader\\.i=@${domainPattern}\\b`, 'i').test(authResults);
  const dmarcPassed = /\bdmarc=pass\b/i.test(authResults);
  const signedHeaders = dkimSignatures.match(/(?:^|;)\s*h=([^;]+)/i)?.[1].toLowerCase() || '';
  const signsReceiptHeaders = ['date', 'from', 'to', 'subject'].every((name) =>
    new RegExp(`(?:^|[\\s:])${name}(?:\\s|:|$)`, 'i').test(signedHeaders),
  );
  const signsExpectedDomain = new RegExp(`(?:^|;)\\s*d=${domainPattern}\\s*(?:;|$)`, 'i').test(dkimSignatures);
  if (!dkimPassed || !dmarcPassed || !signsReceiptHeaders || !signsExpectedDomain) return null;
  return { email: fallback, authenticated: true, reason: 'postmark_dkim_evidence' };
}

export function normalizeInboundEmail(payload, options = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Inbound email payload must be an object.');
  const from = addressValue(payload.FromFull || payload.fromFull) || stringValue(payload.From || payload.from);
  const to = listAddresses(payload.ToFull || payload.toFull) || stringValue(payload.To || payload.to);
  const subject = stringValue(payload.Subject || payload.subject);
  const text = stringValue(payload.TextBody || payload.textBody || payload.text || payload.body);
  const html = stringValue(payload.HtmlBody || payload.htmlBody || payload.html);
  const date = stringValue(payload.Date || payload.date);
  const messageId = stringValue(headerValue(payload.Headers || payload.headers, 'message-id')) || stringValue(payload.MessageID || payload.messageId) || null;
  if ((!subject && options.allowEmptySubject !== true) || (!text && !html)) throw new Error('Inbound email subject and body are required.');
  return { subject, text, html, from, to, date, messageId };
}

// Verify the original MIME when Postmark provides it. Some Postmark streams
// omit RawEmail even with raw-email forwarding enabled, so the fallback above
// requires Postmark Basic Auth plus preserved NayaPay DKIM/DMARC evidence.
export async function authenticateInboundEmail(payload, sender, options = {}) {
  const fallback = normalizeInboundEmail(payload, options);
  const raw = payload.RawEmail;
  if (typeof raw !== 'string' || !raw) {
    return authenticatePostmarkPayload(payload, sender, fallback, options)
      || { email: fallback, authenticated: false, reason: 'missing_original_email' };
  }
  if (Buffer.byteLength(raw) > 1000000) throw Object.assign(new Error('Original email too large.'), { status: 413 });
  const [{ dkimVerify }, { simpleParser }] = await Promise.all([
    import('mailauth/lib/dkim/verify.js'), import('mailparser'),
  ]);
  const dns = new Resolver({ timeout: 2500, tries: 2 });
  let lookups = 0;
  const resolver = options.resolver || (async (name, type) => {
    if (++lookups > 8) throw Object.assign(new Error('DNS lookup limit'), { code: 'ETIMEOUT' });
    try {
      return await dns.resolve(name, type);
    } catch (error) {
      // Vercel's short-lived runtimes can intermittently return a DNS
      // temporary error. Retry through a public DNS-over-HTTPS resolver so a
      // valid NayaPay DKIM signature is not incorrectly rejected as a 503.
      if (error?.code !== 'ETIMEOUT' && error?.code !== 'ESERVFAIL' && error?.code !== 'EAI_AGAIN') throw error;
      return dohResolve(name, type);
    }
  });
  const deadline = setTimeout(() => dns.cancel(), 10000);
  let verification;
  const postmarkEvidenceFallback = () => options.allowPostmarkEvidenceFallback
    ? authenticatePostmarkPayload(payload, sender, fallback, options)
    : null;
  try {
    verification = await dkimVerify(raw, { ...options, resolver });
  } catch (error) {
    const trusted = postmarkEvidenceFallback();
    if (trusted) return trusted;
    throw error;
  }
  finally { clearTimeout(deadline); }
  // NayaPay signs the business-critical receipt headers below. Message-ID and
  // MIME headers are added by mail transport and are not part of its DKIM set.
  // Keep the strict duplicate-header rule for NayaPay. Some bank-forwarding
  // paths add harmless duplicate From/To/Subject/Date lines around a valid
  // signed message, so those providers can explicitly opt into the tolerant
  // path while still requiring a valid DKIM signature and expected sender.
  const critical = ['from', 'to', 'subject', 'date'];
  const headerLines = verification.headers?.parsed || [];
  if (!options.allowAmbiguousOriginalHeaders && critical.some((key) => headerLines.filter((line) => line.key === key).length !== 1)) {
    return { email: fallback, authenticated: false, reason: 'ambiguous_original_headers' };
  }
  const expected = String(sender || '').trim().toLowerCase();
  const domain = String(options.signingDomain || expected.split('@')[1] || '').trim().toLowerCase();
  const authenticationResults = headerLines
    .filter((line) => ['authentication-results', 'arc-authentication-results'].includes(line.key))
    .map((line) => String(line.line || ''))
    .join(' ');
  if (options.requireDmarc && !/\bdmarc=pass\b/i.test(authenticationResults)) {
    return postmarkEvidenceFallback() || { email: fallback, authenticated: false, reason: 'original_dmarc_not_verified' };
  }
  const valid = domain && verification.results.some((result) => {
    const signed = String(result.signingHeaders?.keys || '').toLowerCase().split(':').map((key) => key.trim());
    return result.status?.result === 'pass' && result.signatureTimeValid !== false
      && result.signingDomain?.toLowerCase() === domain && !result.canonBodyLengthLimited
      && critical.every((key) => signed.includes(key));
  });
  if (!valid) {
    if (verification.results.some((result) => result.status?.result === 'temperror')) {
      throw Object.assign(new Error('Email signature lookup temporarily unavailable. Retry delivery.'), { status: 503 });
    }
    return postmarkEvidenceFallback() || { email: fallback, authenticated: false, reason: 'original_signature_not_verified' };
  }
  const parsed = await simpleParser(raw, { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true });
  if (parsed.from?.value?.length !== 1 || parsed.from.value[0].address?.toLowerCase() !== expected) {
    return { email: fallback, authenticated: false, reason: 'unexpected_original_sender' };
  }
  const originalDate = parsed.headerLines?.find((line) => String(line.key || '').toLowerCase() === 'date')?.line
    ?.replace(/^\s*date\s*:\s*/i, '')
    .trim();
  const email = normalizeInboundEmail({
    from: parsed.from.text, to: parsed.to?.text || '', subject: parsed.subject,
    text: parsed.text || '', html: parsed.html || '',
    date: originalDate || parsed.date?.toISOString() || '', messageId: parsed.messageId,
  }, options);
  return { email, authenticated: true, reason: 'original_dkim_verified' };
}
