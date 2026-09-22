import { receiptText } from './core.mjs';

function address(value) {
  return String(value || '').match(/<([^>]+)>/)?.[1] || String(value || '').trim();
}

function cleanLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function utcDate(value) {
  const raw = cleanLine(value)
    .replace(/^\[?UTC\]?\s*/i, '')
    .replace(/\s*\(UTC\)\s*$/i, ' UTC')
    .replace(/\s+UTC\s*$/i, 'Z');
  const normalized = raw.includes('T') ? raw : raw.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, '$1T$2');
  const parsed = new Date(normalized);
  return parsed;
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean))];
}

function extractReferences(...sources) {
  const text = sources.filter(Boolean).join('\n');
  const explicit = [...String(text || '').matchAll(
    /(?:tx\s*id|txid|transaction\s*(?:id|reference)|payment\s*(?:id|reference)|order\s*id|reference\s*(?:id|number)?|merchant\s*trade\s*no\.?)[\s:#-]*([A-Z0-9_-]{6,100})/gi,
  )].map((match) => match[1]);
  const links = [...String(text || '').matchAll(
    /[?&](?:transaction_?id|payment_?id|order_?id|prepay_?id|reference)=([A-Z0-9_-]{6,100})/gi,
  )].map((match) => match[1]);
  // Binance's receipt does not print the transaction id in the visible body.
  // Its signed transaction-history URL carries a JWT whose payload contains
  // the stable payment id. Only use the payload as an identifier; signature
  // and sender/DKIM trust are validated by inbound-email.mjs before parsing.
  const tokenReferences = [];
  for (const match of String(text || '').matchAll(
    /(?:[?&]_bEt=|[?&](?:token|bt)=)([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g,
  )) {
    try {
      const payload = JSON.parse(Buffer.from(match[2], 'base64url').toString('utf8'));
      if (payload?.id) tokenReferences.push(payload.id);
    } catch {
      // Ignore unrelated or malformed links; a missing/ambiguous id stays in review.
    }
  }
  return unique([...explicit, ...links, ...tokenReferences]);
}

function field(text, labels) {
  const pattern = labels.join('|');
  return cleanLine(String(text || '').match(new RegExp(`(?:${pattern})\\s*[:#-]?\\s*([^\\r\\n]+)`, 'i'))?.[1]);
}

function messageParts(payload) {
  return {
    subject: cleanLine(payload?.subject),
    text: [receiptText(payload), String(payload?.text || '').trim()].filter(Boolean).join('\n'),
    html: cleanLine(payload?.html),
    sender: address(payload?.from).toLowerCase(),
    recipient: address(payload?.to).toLowerCase(),
  };
}

function networkField(text) {
  return field(text, ['network', 'chain']);
}

function cryptoAmount(text) {
  const labeled = String(text || '').match(
    /(?:amount|deposit\s+amount|received(?:\s+amount)?|payment\s+amount|credited|you\s+(?:have\s+)?(?:received|deposited))\s*[:#-]?\s*([\d,]+(?:\.\d{1,8})?)\s*(USDT)\b/i,
  );
  if (labeled)
    return {
      amount: Number(labeled[1].replaceAll(',', '')),
      currency: labeled[2].toUpperCase(),
    };
  const candidates = [...String(text || '').matchAll(/([\d,]+(?:\.\d{1,8})?)\s*(USDT)\b/gi)];
  if (candidates.length !== 1) return { amount: NaN, currency: null };
  return {
    amount: Number(candidates[0][1].replaceAll(',', '')),
    currency: candidates[0][2].toUpperCase(),
  };
}

function lastUtcDate(subject) {
  const dates = [...String(subject || '').matchAll(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s*\(UTC\)/gi)];
  return utcDate(dates.at(-1)?.[0] || '');
}

function verifiedResult({
  enabled,
  expectedSender,
  sender,
  expectedRecipient,
  recipient,
  subjectOk,
  currency,
  amount,
  payer,
  transaction,
  receivedDate,
  extraReason = '',
}) {
  const recent = Number.isFinite(receivedDate.getTime()) &&
    receivedDate <= new Date(Date.now() + 60000) &&
    receivedDate > new Date(Date.now() - 7 * 86400000);
  const reason = !enabled
    ? 'automatic_verification_disabled'
    : !expectedSender
      ? 'binance_sender_not_configured'
      : sender !== expectedSender
        ? 'sender_mismatch'
        : !expectedRecipient
          ? 'binance_receiver_mailbox_not_configured'
          : recipient !== expectedRecipient
            ? 'recipient_mismatch'
            : !subjectOk
              ? 'subject_format_not_recognized'
              : currency !== 'USDT'
                ? 'currency_not_usdt'
                : !Number.isFinite(amount) || amount <= 0
                  ? 'invalid_amount'
                  : !payer && extraReason !== 'crypto_payer_optional'
                    ? 'payer_missing'
                    : !transaction
                      ? 'transaction_missing_or_ambiguous'
                      : !recent
                        ? 'receipt_date_outside_window'
                        : extraReason && extraReason !== 'crypto_payer_optional'
                          ? extraReason
                          : 'verified';
  return { recent, reason };
}

/**
 * Parse the Binance payment-received notification without trusting the email
 * on its own. Authentication is performed by inbound-email.mjs first.
 */
export function parseBinanceEmail(payload, config = {}) {
  const { subject, text, html, sender, recipient } = messageParts(payload);
  const expectedSender = String(config.sender || '').trim().toLowerCase();
  const expectedRecipient = String(config.receiverMailbox || '').trim().toLowerCase();
  const subjectDate = subject.match(/\[?Binance\]?\s*Payment\s+Receive\s+Successful\s*-\s*(.+)$/i)?.[1] || '';
  const receivedDate = utcDate(subjectDate);
  const amountMatch = text.match(/(?:amount|received\s+amount|payment\s+amount)\s*[:#-]?\s*([\d,]+(?:\.\d{1,8})?)\s*(USDT)\b/i);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(',', '')) : NaN;
  const currency = amountMatch?.[2]?.toUpperCase() || null;
  const payer = field(text, ['payer', 'sender', 'from', 'received\\s+from']) ||
    cleanLine(text.match(/(?:^|\n)\s*([A-Za-z][A-Za-z0-9_. -]{2,80})\s*\n\s*Amount\s*:/i)?.[1]);
  const references = extractReferences(text, html);
  const transaction = references.length === 1 ? references[0] : null;
  const { recent, reason } = verifiedResult({
    enabled: config.enabled === true,
    expectedSender,
    sender,
    expectedRecipient,
    recipient,
    subjectOk: /^\[?Binance\]?\s*Payment\s+Receive\s+Successful\s*-/i.test(subject),
    currency,
    amount,
    payer,
    transaction,
    receivedDate,
  });
  return {
    paymentMethod: 'binance',
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency,
    payer: payer || null,
    transaction,
    references,
    received: recent ? receivedDate.toISOString() : null,
    verified: reason === 'verified',
    reason,
  };
}

/** Parse Binance's on-chain USDT deposit confirmation email. */
export function parseBinanceCryptoEmail(payload, config = {}) {
  const { subject, text, html, sender, recipient } = messageParts(payload);
  const expectedSender = String(config.sender || '').trim().toLowerCase();
  const expectedRecipient = String(config.receiverMailbox || '').trim().toLowerCase();
  const receivedDate = lastUtcDate(subject);
  const { amount, currency } = cryptoAmount(text);
  const payer = field(text, ['payer', 'sender', 'from', 'received\\s+from', 'source']);
  const references = extractReferences(text, html);
  const transaction = references.length === 1 ? references[0] : null;
  const configuredNetwork = cleanLine(config.network).toLowerCase();
  const network = networkField(text);
  const networkMatches = !configuredNetwork || !network || network.toLowerCase() === configuredNetwork;
  const { recent, reason: baseReason } = verifiedResult({
    enabled: config.enabled === true,
    expectedSender,
    sender,
    expectedRecipient,
    recipient,
    subjectOk: /^\[?Binance\]?\s*USDT\s+Deposit\s+Confirmed\s*-/i.test(subject),
    currency,
    amount,
    payer: payer || 'crypto deposit',
    transaction,
    receivedDate,
    extraReason: networkMatches ? 'crypto_payer_optional' : 'network_mismatch',
  });
  return {
    paymentMethod: 'crypto',
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency,
    payer: payer || null,
    network: network || null,
    transaction,
    references,
    received: recent ? receivedDate.toISOString() : null,
    verified: baseReason === 'verified',
    reason: baseReason,
  };
}
