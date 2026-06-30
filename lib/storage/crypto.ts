// WebCrypto helpers for the encrypted backup (scope/docs/04-data-model.md R14).
// AES-256-GCM with a PBKDF2-SHA-256-derived key. Pure over the Web Crypto API —
// runs identically in the browser and in Node 22 (used by the unit tests). No
// key, salt, or passphrase ever leaves the device; the backup is the only thing
// that does, and only when the user exports it.

export const KDF = 'PBKDF2';
export const KDF_HASH = 'SHA-256';
// OWASP-recommended floor for PBKDF2-SHA-256; high enough to make an offline
// guess of the passphrase that protects a deadname genuinely expensive.
export const KDF_ITERATIONS = 310_000;
// Accepted band for an imported envelope's iteration count. A backup we wrote
// always uses KDF_ITERATIONS; anything outside this band is a corrupted or
// hostile file. The ceiling matters for safety, not just hygiene: deriveKey is
// CPU work, so an unbounded iteration count taken from an untrusted import would
// let a malicious backup hang the device before the GCM tag is ever checked. The
// floor rejects a downgraded file that would be cheap to brute-force.
export const KDF_MIN_ITERATIONS = 100_000;
export const KDF_MAX_ITERATIONS = 10_000_000;

export interface EncryptedEnvelope {
  kdf: typeof KDF;
  hash: typeof KDF_HASH;
  iterations: number;
  /** base64 */
  salt: string;
  /** base64 */
  iv: string;
  /** base64 — AES-GCM ciphertext of the UTF-8 JSON payload */
  ciphertext: string;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  // Back it with a concrete ArrayBuffer (not ArrayBufferLike) so the bytes satisfy
  // WebCrypto's BufferSource typing in both the browser and Node.
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: BufferSource, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    KDF,
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: KDF, salt, iterations, hash: KDF_HASH },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(payload: unknown, passphrase: string): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    kdf: KDF,
    hash: KDF_HASH,
    iterations: KDF_ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ciphertext: toB64(new Uint8Array(ct)),
  };
}

export async function decryptJson(envelope: EncryptedEnvelope, passphrase: string): Promise<unknown> {
  const iterations = envelope?.iterations;
  if (
    typeof iterations !== 'number' ||
    !Number.isInteger(iterations) ||
    iterations < KDF_MIN_ITERATIONS ||
    iterations > KDF_MAX_ITERATIONS
  ) {
    // Reject before deriving a key: a huge iteration count from a hostile file
    // must never be allowed to pin the main thread (see the band constants above).
    throw new Error('This backup file is damaged or was made by a different app.');
  }
  let buf: ArrayBuffer;
  try {
    // Base64-decoding the salt/iv/ciphertext lives inside the try so a malformed
    // (non-base64) envelope also fails as the calm, shared error rather than an
    // uncaught DOMException out of atob().
    const key = await deriveKey(passphrase, fromB64(envelope.salt), iterations);
    buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(envelope.iv) }, key, fromB64(envelope.ciphertext));
  } catch {
    // AES-GCM authentication failed: wrong passphrase or a corrupted/tampered file.
    throw new Error('Wrong passphrase, or the backup file is damaged.');
  }
  return JSON.parse(new TextDecoder().decode(new Uint8Array(buf)));
}
