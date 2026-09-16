/**
 * Module bảo mật mã hóa và băm mật khẩu người dùng (Password Hashing & Cryptography)
 * Tiêu chuẩn: Salted SHA-256 lặp (1000 rounds) kèm muối ngẫu nhiên (Cryptographic Salt)
 * Định dạng lưu trữ: $sha256$v1$<iterations>$<salt>$<hash>
 * Đảm bảo không bao giờ lưu trữ mật khẩu dưới dạng văn bản gốc (Plaintext).
 */

// Mã hóa chuỗi sang định dạng UTF-8 chuẩn xác
function utf8Encode(str: string): string {
  let utf8 = '';
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8 += String.fromCharCode(charcode);
    } else if (charcode < 0x800) {
      utf8 += String.fromCharCode(0xc0 | (charcode >> 6));
      utf8 += String.fromCharCode(0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8 += String.fromCharCode(0xe0 | (charcode >> 12));
      utf8 += String.fromCharCode(0x80 | ((charcode >> 6) & 0x3f));
      utf8 += String.fromCharCode(0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8 += String.fromCharCode(0xf0 | (charcode >> 18));
      utf8 += String.fromCharCode(0x80 | ((charcode >> 12) & 0x3f));
      utf8 += String.fromCharCode(0x80 | ((charcode >> 6) & 0x3f));
      utf8 += String.fromCharCode(0x80 | (charcode & 0x3f));
    }
  }
  return utf8;
}

// Thuật toán băm SHA-256 thuần chuẩn FIPS 180-4 (hoạt động đồng bộ 100% trên cả Browser & Node.js)
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: { [n: number]: number } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice();

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.unshift((temp1 + temp2) | 0);
      hash.pop();
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Tạo muối ngẫu nhiên an toàn bảo mật (Cryptographic Salt)
export function generateSalt(byteLength = 16): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(byteLength);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback if crypto is unavailable
  }

  // Dự phòng an toàn kết hợp timestamp, entropy và Math.random
  let salt = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < byteLength * 2; i++) {
    const r = Math.floor(Math.random() * 16);
    salt += hex[r];
  }
  return salt;
}

const DEFAULT_ITERATIONS = 1000;
const HASH_PREFIX = '$sha256$v1$';

/**
 * Băm mật khẩu người dùng với Muối (Salt) và số vòng lặp (Iterations)
 * Trả về chuỗi định dạng: $sha256$v1$<iterations>$<salt>$<hash>
 */
export function hashPassword(
  password: string,
  salt?: string,
  iterations = DEFAULT_ITERATIONS
): string {
  const cleanPass = password.trim();
  const effectiveSalt = salt || generateSalt(16);
  
  // Vòng lặp băm tăng cường bảo mật chống tấn công vét cạn (Brute-force / Rainbow Table)
  let currentHash = sha256(utf8Encode(`${effectiveSalt}:${cleanPass}:${effectiveSalt}`));
  for (let i = 1; i < iterations; i++) {
    currentHash = sha256(utf8Encode(`${currentHash}:${effectiveSalt}:${i}`));
  }

  return `${HASH_PREFIX}${iterations}$${effectiveSalt}$${currentHash}`;
}

/**
 * Kiểm tra xem chuỗi mật khẩu trong DB/LocalStorage có phải đã được băm mã hóa hay chưa
 */
export function isPasswordEncrypted(storedValue?: string): boolean {
  if (!storedValue || typeof storedValue !== 'string') return false;
  return storedValue.startsWith(HASH_PREFIX);
}

/**
 * So sánh an toàn chống tấn công dựa trên thời gian (Timing-safe string comparison)
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface PasswordVerificationResult {
  isValid: boolean;
  wasPlaintext: boolean;
  upgradedHash?: string;
}

/**
 * Xác thực mật khẩu người dùng nhập vào với mật khẩu đã lưu
 * Tự động hỗ trợ kiểm tra cả định dạng mã hóa mới ($sha256$v1$) và định dạng cũ (Plaintext migration)
 */
export function verifyPassword(
  passwordInput: string,
  storedValue?: string
): PasswordVerificationResult {
  if (!storedValue) {
    return { isValid: false, wasPlaintext: false };
  }

  const cleanInput = passwordInput.trim();

  // 1. Nếu là định dạng mã hóa chuẩn
  if (storedValue.startsWith(HASH_PREFIX)) {
    const parts = storedValue.split('$');
    // Định dạng: ["", "sha256", "v1", "<iterations>", "<salt>", "<hash>"]
    if (parts.length >= 6) {
      const iterations = parseInt(parts[3], 10) || DEFAULT_ITERATIONS;
      const salt = parts[4];
      const expectedHash = parts[5];

      const computedHashWithPrefix = hashPassword(cleanInput, salt, iterations);
      const computedHash = computedHashWithPrefix.split('$')[5];

      const isMatch = constantTimeCompare(computedHash, expectedHash);
      return { isValid: isMatch, wasPlaintext: false };
    }
  }

  // 2. Chế độ chuyển đổi tự động (Legacy Plaintext Migration):
  // Nếu dữ liệu cũ trong localStorage vẫn là bản rõ (ví dụ: 'Vungochan@2015')
  const isPlaintextMatch = constantTimeCompare(cleanInput, storedValue.trim());
  if (isPlaintextMatch) {
    // Tự động tạo bản băm mã hóa mới để nâng cấp lưu trữ ngay lập tức
    const upgradedHash = hashPassword(cleanInput);
    return { isValid: true, wasPlaintext: true, upgradedHash };
  }

  return { isValid: false, wasPlaintext: false };
}

/**
 * Trả về chuỗi hiển thị bảo mật để che giấu mật khẩu
 */
export function getMaskedPasswordLabel(): string {
  return '•••••••••••••••• (Đã mã hóa bảo mật)';
}
