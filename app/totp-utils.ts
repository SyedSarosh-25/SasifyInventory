const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_PERIOD_SECONDS = 30;

function decodeBase32(secret: string) {
  const compact = secret.toUpperCase().replace(/[\s-]/g, '');
  if (!compact) throw new Error('Enter your 2FA setup key first.');
  if (!/^[A-Z2-7]+=*$/.test(compact)) {
    throw new Error('This does not look like a valid Base32 2FA setup key.');
  }

  const unpadded = compact.replace(/=+$/, '');
  if ([1, 3, 6].includes(unpadded.length % 8)) {
    throw new Error('The 2FA setup key is incomplete or invalid.');
  }

  const output = new Uint8Array(Math.floor((unpadded.length * 5) / 8));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const character of unpadded) {
    buffer = (buffer << 5) | BASE32_ALPHABET.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }
  return output;
}

export function totpRemainingSeconds(nowMs = Date.now()) {
  const elapsed = Math.floor(nowMs / 1000) % TOTP_PERIOD_SECONDS;
  return TOTP_PERIOD_SECONDS - elapsed;
}

export async function generateTotp(secret: string, nowMs = Date.now()) {
  const secretBytes = decodeBase32(secret);
  const counter = Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);
  const counterBytes = new ArrayBuffer(8);
  const counterView = new DataView(counterBytes);
  counterView.setUint32(0, Math.floor(counter / 0x100000000));
  counterView.setUint32(4, counter >>> 0);

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.sign('HMAC', key, counterBytes),
  );
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}
