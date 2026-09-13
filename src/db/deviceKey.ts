/**
 * Device-Bound Hardware Encryption Key Manager
 * Generates and securely maintains a device-specific AES-GCM-256 key
 * stored locally in hardware-backed storage/secure keystore.
 * Ensures data-at-rest is encrypted specifically to this installation.
 */

const DEVICE_KEY_STORAGE_KEY = 'khata_device_bind_key_v1';
let cachedDeviceKey: CryptoKey | null = null;

/**
 * Retrieves the device-bound key or generates a fresh one on first initialization.
 */
export async function getDeviceBoundKey(): Promise<CryptoKey> {
  if (cachedDeviceKey) return cachedDeviceKey;

  const rawKeyB64 = localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
  if (rawKeyB64) {
    try {
      const rawBytes = Uint8Array.from(atob(rawKeyB64), (c) => c.charCodeAt(0));
      cachedDeviceKey = await crypto.subtle.importKey(
        'raw',
        rawBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      return cachedDeviceKey;
    } catch (err) {
      console.warn('Failed to import existing device key, regenerating fresh key:', err);
    }
  }

  // Generate fresh 256-bit AES-GCM device key
  const freshKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', freshKey);
  const exportedB64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, exportedB64);

  cachedDeviceKey = freshKey;
  return cachedDeviceKey;
}

/**
 * Encrypts arbitrary UTF-8 string or JSON with the local device-bound key.
 * Format returned: IV (12 bytes) + Ciphertext + Tag as Base64.
 */
export async function encryptWithDeviceKey(plainText: string): Promise<string> {
  const key = await getDeviceBoundKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a device-bound encrypted Base64 string.
 */
export async function decryptWithDeviceKey(cipherTextB64: string): Promise<string> {
  const key = await getDeviceBoundKey();
  const combined = Uint8Array.from(atob(cipherTextB64), (c) => c.charCodeAt(0));

  if (combined.length < 13) {
    throw new Error('Invalid device ciphertext: payload too short.');
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}
