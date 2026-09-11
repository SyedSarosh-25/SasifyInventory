const sensitiveKey = /(authorization|api[-_]?key|access[-_]?token|refresh[-_]?token|secret|password|credential|cookie|set-cookie|delivery|items|content|result|\bcode\b)/i;

function trimText(value, limit = 12000) {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, limit)}…[truncated]` : text;
}

export function redactForSupplierLog(value, depth = 0) {
  if (depth > 6) return '[depth limited]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return trimText(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => redactForSupplierLog(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 100)
      .map(([key, item]) => [
        key,
        sensitiveKey.test(key)
          ? '[REDACTED]'
          : redactForSupplierLog(item, depth + 1),
      ]),
  );
}

export function supplierLogHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {})
      .filter(([key]) => !sensitiveKey.test(key))
      .map(([key, value]) => [key, trimText(value, 500)]),
  );
}

export function supplierLogPayload(value) {
  if (value === undefined || value === null || value === '') return null;
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return trimText(value);
    }
  }
  return redactForSupplierLog(parsed);
}

export function supplierErrorMessage(data, fallback) {
  const error = data?.error;
  return (
    error?.message_en ||
    error?.message ||
    error?.detail ||
    (typeof error === 'string' ? error : '') ||
    data?.message ||
    data?.detail ||
    fallback
  );
}

export async function notifySupplierApiExchange(onExchange, exchange) {
  if (onExchange) await onExchange(exchange);
}
