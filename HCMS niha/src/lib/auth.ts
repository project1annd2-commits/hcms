import { User, Permission, Teacher, Mentor, Management } from './models';
import { db } from './services/db';
import { generateToken, setStoredToken, removeStoredToken, getStoredToken, verifyToken, getCurrentUserFromToken } from './jwt';

const STORAGE_KEY = 'hcms_current_user';
const TEACHER_STORAGE_KEY = 'hcms_current_teacher';
const MENTOR_STORAGE_KEY = 'hcms_current_mentor';
const MANAGEMENT_STORAGE_KEY = 'hcms_current_management';
const LAST_ACTIVITY_KEY = 'hcms_last_activity';
const INACTIVITY_TIMEOUT = 10 * 60 * 60 * 1000; // 10 hours in milliseconds

/**
 * No-op placeholder — Firebase Auth custom tokens removed.
 * Kept to avoid breaking call sites.
 */
export const signInToFirebaseAuth = async (_userId: string, _role: string): Promise<void> => {
    // No-op: custom token auth has been removed
};

const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

export const hashPassword = async (password: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return simpleHash(password);
    }
  }
  return simpleHash(password);
};

/**
 * Login for admin / employee — queries Firestore directly from the frontend.
 * No server dependency needed.
 */
export const login = async (username: string, password: string): Promise<{ user: User; permissions: Permission; error?: string } | null> => {
  try {
    const response = await fetch(`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { user: {} as User, permissions: {} as Permission, error: errorData.error || 'Invalid username or password' };
    }

    const { user, permissions, token } = await response.json();

    const userWithPermissions = { user: user as User, permissions: permissions as Permission };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithPermissions));
    setStoredToken(token);
    updateLastActivity();

    return userWithPermissions;
  } catch (error) {
    console.error('Login error:', error);
    return { user: {} as User, permissions: {} as Permission, error: 'Login failed. Please check your connection.' };
  }
};

/**
 * Verify phone number — queries Firestore directly from the frontend.
 */
export const verifyPhone = async (phone: string): Promise<{ type: string; userId: string; name: string; hasPassword: boolean; error?: string } | null> => {
  try {
    const response = await fetch(`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/auth/verify-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { type: '', userId: '', name: '', hasPassword: false, error: errorData.error || 'Phone number not found' };
    }

    return await response.json();
  } catch (error) {
    console.error('Phone verification error:', error);
    return null;
  }
};

/**
 * Participant login — verifies password directly from Firestore.
 */
export const participantLogin = async (userId: string, type: string, password: string): Promise<{ success: boolean; token?: string; error?: string } | null> => {
  try {
    const response = await fetch(`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/auth/participant-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Incorrect password' };
    }

    const { token } = await response.json();
    setStoredToken(token);

    return { success: true, token };
  } catch (error) {
    console.error('Participant login error:', error);
    return { success: false, error: 'Login failed' };
  }
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TEACHER_STORAGE_KEY);
  localStorage.removeItem(MENTOR_STORAGE_KEY);
  localStorage.removeItem(MANAGEMENT_STORAGE_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  removeStoredToken();
};

export const getCurrentUser = (): { user: User; permissions: Permission } | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const getCurrentTeacher = (): Teacher | null => {
  const stored = localStorage.getItem(TEACHER_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const getCurrentMentor = (): Mentor | null => {
  const stored = localStorage.getItem(MENTOR_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};


export const managementLogin = async (phone: string): Promise<Management | null> => {
  try {
    const response = await fetch(`${import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/auth/management-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    if (!response.ok) {
      return null;
    }

    const { user, token } = await response.json();
    localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(user));
    setStoredToken(token);
    updateLastActivity();

    return user;
  } catch (error) {
    console.error('Management login error:', error);
    return null;
  }
};

export const getCurrentManagement = (): Management | null => {
  const stored = localStorage.getItem(MANAGEMENT_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const generateUsername = (fullName: string): string => {
  const cleaned = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.floor(Math.random() * 1000);
  return `${cleaned}${random}`;
};

export const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};


export const updateLastActivity = (): void => {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

export const checkSessionTimeout = (): boolean => {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false;

  const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
  return timeSinceLastActivity > INACTIVITY_TIMEOUT;
};

export const getJWTUser = async (): Promise<{ userId: string; username: string; role: string } | null> => {
  const tokenUser = await getCurrentUserFromToken();
  if (!tokenUser) return null;
  return {
    userId: tokenUser.userId,
    username: tokenUser.username,
    role: tokenUser.role
  };
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
};
