import { hash, parseReceiptDate, receiptText } from './core.mjs';

function address(value) {
  return String(value || '').match(/<([^>]+)>/)?.[1] || String(value || '').trim();
}

function cleanLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function field(text, label) {
  return cleanLine(String(text || '').match(new RegExp(`${label}\\s*[:#-]?\\s*([^\\r\\n]+)`, 'i'))?.[1]);
}

function accountLast4(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function transactionDate(text) {
  const dateValue = field(text, 'Transaction\\s+Date');
  const timeValue = field(text, 'Transaction\\s+Time');
  const date = dateValue.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9}|\d{1,2})[-/\s](\d{4})$/);
  const time = timeValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!date || !time) return new Date(NaN);
  const months = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  const month = Number.isFinite(Number(date[2])) ? Number(date[2]) : months[date[2].toLowerCase()];
  let hour = Number(time[1]);
  const minute = Number(time[2]);
  const second = Number(time[3] || 0);
  const meridiem = time[4]?.toLowerCase();
  if (!month || hour > 23 || minute > 59 || second > 59) return new Date(NaN);
  if (meridiem) {
    if (hour < 1 || hour > 12) return new Date(NaN);
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  }
  return parseReceiptDate(`${date[3]}-${String(month).padStart(2, '0')}-${String(date[1]).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`);
}

/** Parse Meezan's credit alert, which has no visible transaction ID. */
export function parseMeezanEmail(payload, config = {}) {
  const subject = cleanLine(payload?.subject);
  const text = receiptText(payload);
  const sender = address(payload?.from).toLowerCase();
  const recipient = address(payload?.to).toLowerCase();
  const amountMatch = text.match(/\bPKR\s*([\d,]+(?:\.\d{1,2})?)\s+(?:received\s+to\s+your|has\s+been\s+received\s+in\s+your)\s+(?:MBL\s+)?account\b/i);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(',', '')) : NaN;
  const accountLine = text.match(/\baccount\s+([xX*•\d][xX*•\d\s-]{3,30})(?=\s*(?:[.,]|with\b|$))/i)?.[1] || '';
  const beneficiary = field(text, 'Beneficiary\\s+Account');
  const sourceLast4 = accountLast4(accountLine);
  const received = transactionDate(text);
  const recent = Number.isFinite(received.getTime()) && received <= new Date(Date.now() + 60000) && received > new Date(Date.now() - 7 * 86400000);
  const expectedSender = String(config.sender || '').trim().toLowerCase();
  const expectedMailbox = String(config.receiverMailbox || '').trim().toLowerCase();
  const expectedAccountLast4 = accountLast4(config.receiverAccount);
  const accountMatches = !!expectedAccountLast4 && sourceLast4 === expectedAccountLast4;
  const recipientMatches = !!expectedMailbox && recipient === expectedMailbox;
  const subjectMatches = !subject || /^\(no subject\)$/i.test(subject) || /^Credit\s+Transaction\s+Alert$/i.test(subject);
  const tid = text.match(/\bTID\s*[:#-]?\s*([A-Z0-9-]{6,80})/i)?.[1]?.toUpperCase() || null;
  const fingerprintSource = String(payload?.messageId || '').trim() || [subject, text, payload?.date || ''].join('\n');
  const transaction = tid || (fingerprintSource ? `MEEZAN-${hash(fingerprintSource).slice(0, 32).toUpperCase()}` : null);
  const payer = text.match(/\breceived\s+from\s+(.+?)(?=\s*\(|[\r\n]|$)/i)?.[1]?.trim() || 'Meezan Bank transfer';
  const reason = config.enabled !== true ? 'automatic_verification_disabled'
    : !expectedSender ? 'meezan_sender_not_configured'
      : sender !== expectedSender ? 'sender_mismatch'
        : !expectedMailbox ? 'meezan_receiver_mailbox_not_configured'
          : !recipientMatches ? 'recipient_mismatch'
              : !subjectMatches ? 'subject_format_not_recognized'
              : !Number.isSafeInteger(amount) || amount <= 0 ? 'invalid_amount'
                : !accountMatches ? 'account_mismatch'
                  : !Number.isFinite(received.getTime()) ? 'transaction_date_missing_or_invalid'
                    : !recent ? 'receipt_date_outside_window'
                      : !transaction ? 'transaction_missing_or_ambiguous' : 'verified';
  return {
    paymentMethod: 'bank', amount: Number.isSafeInteger(amount) && amount > 0 ? amount : null,
    currency: 'PKR', payer, beneficiary: beneficiary || null,
    sourceLast4, transaction, received: recent ? received.toISOString() : null,
    verified: reason === 'verified', reason,
  };
}
