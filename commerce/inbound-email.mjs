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
  if (!Array.isArray(headers)) return '';
  const wanted = name.toLowerCase();
  return headers.find((header) => stringValue(header?.Name || header?.name).toLowerCase() === wanted)?.Value
    || headers.find((header) => stringValue(header?.Name || header?.name).toLowerCase() === wanted)?.value
    || '';
}

export function normalizeInboundEmail(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Inbound email payload must be an object.');
  const from = addressValue(payload.FromFull || payload.fromFull) || stringValue(payload.From || payload.from);
  const to = listAddresses(payload.ToFull || payload.toFull) || stringValue(payload.To || payload.to);
  const subject = stringValue(payload.Subject || payload.subject);
  const text = stringValue(payload.TextBody || payload.textBody || payload.text || payload.body);
  const html = stringValue(payload.HtmlBody || payload.htmlBody || payload.html);
  const date = stringValue(payload.Date || payload.date);
  const messageId = stringValue(headerValue(payload.Headers || payload.headers, 'message-id')) || stringValue(payload.MessageID || payload.messageId) || null;
  if (!subject || (!text && !html)) throw new Error('Inbound email subject and body are required.');
  return { subject, text, html, from, to, date, messageId };
}

// Verify the original MIME, then parse that same content. Webhook JSON fields
// and Authentication-Results headers alone are not proof of a bank receipt.
export async function authenticateInboundEmail(payload, sender, options = {}) {
  const fallback = normalizeInboundEmail(payload);
  const raw = payload.RawEmail;
  if (typeof raw !== 'string' || !raw) return { email: fallback, authenticated: false, reason: 'missing_original_email' };
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
  try { verification = await dkimVerify(raw, { ...options, resolver }); }
  finally { clearTimeout(deadline); }
  // NayaPay signs the business-critical receipt headers below. Message-ID and
  // MIME headers are added by mail transport and are not part of its DKIM set.
  // Reject duplicates for the signed fields to avoid parser/signature
  // disagreement while matching NayaPay's actual signature contract.
  const critical = ['from', 'to', 'subject', 'date'];
  const headerLines = verification.headers?.parsed || [];
  if (critical.some((key) => headerLines.filter((line) => line.key === key).length !== 1)) {
    return { email: fallback, authenticated: false, reason: 'ambiguous_original_headers' };
  }
  const expected = String(sender || '').trim().toLowerCase();
  const domain = expected.split('@')[1];
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
    return { email: fallback, authenticated: false, reason: 'original_signature_not_verified' };
  }
  const parsed = await simpleParser(raw, { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true });
  if (parsed.from?.value?.length !== 1 || parsed.from.value[0].address?.toLowerCase() !== expected) {
    return { email: fallback, authenticated: false, reason: 'unexpected_original_sender' };
  }
  const email = normalizeInboundEmail({
    from: parsed.from.text, to: parsed.to?.text || '', subject: parsed.subject,
    text: parsed.text || '', html: parsed.html || '', date: parsed.date?.toISOString() || '', messageId: parsed.messageId,
  });
  return { email, authenticated: true, reason: 'original_dkim_verified' };
}
