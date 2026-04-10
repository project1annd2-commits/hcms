const JWT_SECRET_KEY = 'hcms_jwt_secret_key_2024';
const TOKEN_EXPIRY_HOURS = 10;

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signHMAC(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return base64UrlEncode(signature);
}

async function verifyHMAC(data: string, signature: string, key: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const signatureBuffer = base64UrlDecode(signature);
  return crypto.subtle.verify('HMAC', cryptoKey, signatureBuffer.buffer as ArrayBuffer, encoder.encode(data));
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  permissions?: any;
  iat: number;
  exp: number;
}

export const generateToken = async (user: { id?: string; _id?: string; username: string; role: string }, permissions?: any): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    userId: user.id || user._id || '',
    username: user.username,
    role: user.role,
    permissions,
    iat: now,
    exp: now + (TOKEN_EXPIRY_HOURS * 60 * 60)
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerEncoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadEncoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signHMAC(`${headerEncoded}.${payloadEncoded}`, JWT_SECRET_KEY);

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
};

export const verifyToken = async (token: string): Promise<JWTPayload | null> => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerEncoded, payloadEncoded, signature] = parts;
    const isValid = await verifyHMAC(`${headerEncoded}.${payloadEncoded}`, signature, JWT_SECRET_KEY);
    if (!isValid) return null;

    const decoded = base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(new TextDecoder().decode(decoded)) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem('hcms_jwt_token');
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem('hcms_jwt_token', token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem('hcms_jwt_token');
};

export const isTokenExpired = async (token: string): Promise<boolean> => {
  const payload = await verifyToken(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
};

export const getCurrentUserFromToken = async (): Promise<JWTPayload | null> => {
  const token = getStoredToken();
  if (!token) return null;
  return verifyToken(token);
};