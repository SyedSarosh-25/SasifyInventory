import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { convert } from 'html-to-text';

export const hash = (value) => createHash('sha256').update(value).digest('hex');
export function signature(payload, key) {
  return createHmac('sha256', key).update(JSON.stringify([payload.messageId,payload.date,payload.from,payload.subject,payload.text,payload.sentAt,payload.html || '',payload.to || ''])).digest('hex');
}
export const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length > 0 && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export function encrypt(value, key) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((v) => v.toString('base64')).join('.');
}
export function decrypt(value, key) {
  const [iv, tag, data] = value.split('.').map((v) => Buffer.from(v, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString());
}
export function normalizeTransaction(value) {
  const result = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,80}$/.test(result)) throw new Error('Enter the complete transaction ID from your receipt.');
  return result;
}
export function receiptText(payload) {
  return payload.html ? convert(String(payload.html), { wordwrap:false, selectors:[{selector:'a',options:{ignoreHref:true}},{selector:'img',format:'skip'},{selector:'td',format:'block',options:{leadingLineBreaks:1,trailingLineBreaks:1}}] }) : String(payload.text || '').trim();
}
function normalizedReceiptName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}
export function parseEmail(payload, config = {}) {
  const subject = String(payload.subject || '').trim();
  const text = receiptText(payload);
  const walletId = text.match(/^\s*([a-z0-9._-]{2,64}@nayapay)\s*$/im)?.[1]?.toLowerCase();
  const sourceValue = text.match(/(?:Source\s+Acc\.?\s*(?:Number|No\.?)|Raast\s+ID\s*\/\s*IBAN)\s*(?::|-)?\s*([^\r\n]+)/i)?.[1]?.trim() || '';
  const sourceDigits = sourceValue.replace(/\D/g, '');
  const sourceLast4 = sourceDigits.length >= 4 ? sourceDigits.slice(-4) : walletId || null;
  const match = /^You got\s+(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{1,2})?)\s+from\s+(.+?)\s*(?:🎉)?$/u.exec(subject);
  if (!match) return { amount: null, payer: null, transaction: null, verified: false, reason: 'subject_format_not_recognized' };
  const amount = Number(match[1].replaceAll(',', ''));
  const bodyAmount = Number(text.match(/Amount\s+Received\s*[:\s]*(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{1,2})?)/i)?.[1]?.replaceAll(',',''));
  const destination = text.match(/Destination\s+Acc\.?\s*Title\s*[:\s]*([^\r\n]+)/i)?.[1]?.trim();
  const refs = [...text.matchAll(/(?:Transaction\s*ID|Transaction\s*Reference|Reference\s*(?:Number|ID))\s*[:#-]?\s*([A-Za-z0-9-]{6,80})/gi)];
  const unique = [...new Set(refs.map((r) => r[1].toUpperCase()))];
  const transaction = unique.length === 1 ? unique[0] : null;
  const sender = String(payload.from || '').match(/<([^>]+)>/)?.[1] || String(payload.from || '');
  const received = new Date(payload.date || '');
  const recent = Number.isFinite(received.getTime()) && received <= new Date(Date.now() + 60000) && received > new Date(Date.now() - 7 * 86400000);
  const recipient = String(payload.to || '').trim().toLowerCase();
  const walletReceiver = !!walletId && !!config.receiverMailbox && (recipient === config.receiverMailbox.toLowerCase() || recipient.match(/<([^>]+)>/)?.[1] === config.receiverMailbox.toLowerCase());
  const destinationMatches = !!config.receiver && normalizedReceiptName(destination) === normalizedReceiptName(config.receiver);
  // Email parsing alone is not authority to release stock. Enable only after validating the real receipt format.
  const reason = config.enabled !== true ? 'automatic_verification_disabled'
    : !config.sender || sender.toLowerCase() !== config.sender.toLowerCase() ? 'sender_mismatch'
      : !(destinationMatches || (!destination && walletReceiver)) ? 'destination_or_recipient_mismatch'
        : bodyAmount !== amount ? 'body_and_subject_amount_mismatch'
          : !transaction ? 'transaction_missing_or_ambiguous'
            : !recent ? 'receipt_date_outside_window'
              : !Number.isSafeInteger(amount) || amount <= 0 ? 'invalid_amount'
                : !sourceLast4 ? 'source_identifier_missing'
                  : 'verified';
  return { amount: Number.isSafeInteger(amount) && amount > 0 ? amount : null, payer: match[2].trim(), transaction, sourceLast4, verified: reason === 'verified', reason, received: recent ? received.toISOString() : null };
}
export function parseInventory(input) {
  if (typeof input !== 'string' || input.length > 150000) throw new Error('Import is too large.');
  const rows = input.trim().split(/\r?\n/).filter((s) => s.trim());
  if (!rows.length || rows.length > 100) throw new Error('Import between 1 and 100 accounts at a time.');
  const seen = new Set();
  return rows.map((line, i) => {
    const values = line.split('|').map((s) => s.trim());
    if (values.length !== 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[0]) || !values[1] || !values[2]) throw new Error(`Check email | password | 2FA on line ${i + 1}.`);
    const email = values[0].toLowerCase();
    if (seen.has(email)) throw new Error(`Duplicate email on line ${i + 1}.`);
    seen.add(email);
    return { email, password: values[1], twoFactor: values[2] };
  });
}
