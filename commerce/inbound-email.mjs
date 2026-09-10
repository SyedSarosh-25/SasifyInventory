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
  const date = stringValue(payload.Date || payload.date) || new Date().toISOString();
  const messageId = stringValue(payload.MessageID || payload.messageId) || stringValue(headerValue(payload.Headers || payload.headers, 'message-id')) || null;
  if (!subject || (!text && !html)) throw new Error('Inbound email subject and body are required.');
  return { subject, text, html, from, to, date, messageId };
}
