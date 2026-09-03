// Native Web Crypto API (crypto.subtle) encryption service for Khata Ghar
// Uses PBKDF2-SHA256 (250,000 iterations) for key derivation & AES-256-GCM for encryption

const PBKDF2_ITERATIONS = 250000;
const KEY_LENGTH = 256;
const VERIFIER_PLAINTEXT = 'KHATA_GHAR_VAULT_KEY_VERIFIER_V1';

// Convert ArrayBuffer to Hex String
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex String to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert ArrayBuffer to Base64 String
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 String to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate random cryptographic salt (16 bytes)
export function generateSalt(): string {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  return bufferToHex(saltBytes);
}

// Generate random IV for AES-GCM (12 bytes standard)
export function generateIV(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

// Derive a 256-bit AES-GCM CryptoKey from password and salt using PBKDF2-SHA256
export async function deriveKey(password: string, saltHex: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBytes = hexToBuffer(saltHex);

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false, // key is non-extractable from memory
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

// Generate a password verifier ciphertext by encrypting a known constant
export async function generateVerifier(key: CryptoKey): Promise<string> {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(VERIFIER_PLAINTEXT);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    plaintext
  );

  // Store format: "ivHex:ciphertextBase64"
  return `${bufferToHex(iv)}:${bufferToBase64(ciphertextBuffer)}`;
}

// Verify a derived key against stored verifier
export async function verifyKey(key: CryptoKey, storedVerifier: string): Promise<boolean> {
  try {
    const parts = storedVerifier.split(':');
    if (parts.length !== 2) return false;

    const iv = hexToBuffer(parts[0]);
    const ciphertext = base64ToBuffer(parts[1]);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);
    return decryptedText === VERIFIER_PLAINTEXT;
  } catch (err) {
    return false;
  }
}

// Encrypt any serializable data object into { iv, ciphertext }
export async function encryptData<T>(data: T, key: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(jsonString);

  const iv = generateIV();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    plaintextBytes
  );

  return {
    iv: bufferToHex(iv),
    ciphertext: bufferToBase64(ciphertextBuffer),
  };
}

// Decrypt { iv, ciphertext } back into original typed data object
export async function decryptData<T>(ivHex: string, ciphertextBase64: string, key: CryptoKey): Promise<T> {
  const iv = hexToBuffer(ivHex);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

// Password strength calculation
export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: string;
  feedback: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  if (!password) {
    return { score: 0, label: 'Very Weak', color: 'bg-slate-300 dark:bg-slate-700', feedback: ['Enter a password'] };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  else feedback.push('At least 8 characters');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include both lowercase & uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character (!@#$%^&*)');
  }

  // Normalized score 0-4
  const finalScore = Math.min(4, Math.floor((score / 5) * 4));

  const scoreMap: Record<number, { label: PasswordStrength['label']; color: string }> = {
    0: { label: 'Very Weak', color: 'bg-rose-500' },
    1: { label: 'Weak', color: 'bg-orange-500' },
    2: { label: 'Medium', color: 'bg-amber-500' },
    3: { label: 'Strong', color: 'bg-emerald-500' },
    4: { label: 'Very Strong', color: 'bg-emerald-600' },
  };

  return {
    score: finalScore,
    label: scoreMap[finalScore].label,
    color: scoreMap[finalScore].color,
    feedback,
  };
}

// Hash a string (e.g. Decoy PIN) with SHA-256
export async function hashStringSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(new Uint8Array(hashBuffer));
}

// Strict password policy: High-End Strong / Very Strong required (min 10 chars, uppercase, lowercase, number, symbol)
export function isAcceptablePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 10) {
    return { valid: false, reason: 'Password must be at least 10 characters long.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Must include at least one lowercase letter (a-z).' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Must include at least one uppercase letter (A-Z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Must include at least one numeric digit (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: 'Must include at least one special symbol (!@#$%^&*).' };
  }
  const evalResult = evaluatePasswordStrength(password);
  if (evalResult.score < 3) {
    return { valid: false, reason: 'High-entropy password required. Moderate or weak passwords are not permitted.' };
  }
  return { valid: true };
}
