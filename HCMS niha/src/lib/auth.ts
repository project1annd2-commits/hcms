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
    // Query Firestore 'users' collection directly
    console.log('Querying users collection for username:', username);
    let users = await db.find<any>('users', { username }, { limit: 1 });
    console.log('Query result:', users);

    // Auto-seed admin if not found and this is the admin login attempt
    if ((!users || users.length === 0) && username === 'admin') {
      console.log('No admin user found – auto-seeding admin account…');
      const hashedPw = await hashPassword('admin123');
      const newUser = await db.insertOne('users', {
        username: 'admin',
        plain_passcode: 'admin123',
        password_hash: hashedPw,
        full_name: 'System Admin',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log('Admin user seeded successfully:', newUser);
      
      // Verify the user was actually created by querying again
      const verificationQuery = await db.find<any>('users', { username: 'admin' }, { limit: 1 });
      console.log('Verification query result:', verificationQuery);
      
      // Use the newly created user directly instead of re-querying
      users = [newUser];
    }

    if (!users || users.length === 0) {
      return { user: {} as User, permissions: {} as Permission, error: 'Invalid username or password' };
    }

    const userData = users[0];

    if (!userData.is_active) {
      return { user: {} as User, permissions: {} as Permission, error: 'Account is inactive' };
    }

    // Check password: support plain_passcode / passcode (plaintext) and SHA-256 hash
    const storedPasscode = userData.plain_passcode || userData.passcode;
    const hashedInput = await hashPassword(password);

    // bcrypt hashes start with "$2" – they can't be verified client-side,
    // so we only compare SHA-256 hashes or plaintext passcodes.
    const hashIsSha256 = userData.password_hash && !userData.password_hash.startsWith('$2');

    console.log('Password verification:', {
      storedPasscode,
      password,
      hashIsSha256,
      storedHash: userData.password_hash,
      inputHash: hashedInput
    });

    const isCorrect = (storedPasscode && storedPasscode === password) ||
                      (hashIsSha256 && userData.password_hash === hashedInput);

    console.log('Password verification result:', isCorrect);

    if (!isCorrect) {
      // If we have a bcrypt hash (can't verify client-side) and no plaintext match,
      // auto-upgrade: store SHA-256 + plaintext so future logins work, then retry
      if (userData.password_hash && userData.password_hash.startsWith('$2') && !storedPasscode) {
        return { user: {} as User, permissions: {} as Permission, error: 'Invalid username or password. Please contact your administrator to reset your password.' };
      }
      return { user: {} as User, permissions: {} as Permission, error: 'Invalid username or password' };
    }

    // If the user doesn't have a SHA-256 hash yet, upgrade their record
    if (!hashIsSha256 || !userData.password_hash) {
      try {
        await db.updateById('users', userData.id, {
          password_hash: hashedInput,
          plain_passcode: password,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        // Non-critical, ignore
      }
    }

    // Get permissions
    const perms = await db.find<any>('permissions', { user_id: userData.id }, { limit: 1 });
    let permissions = perms && perms.length > 0 ? perms[0] : null;

    // Auto-create permissions for admin if missing
    if (!permissions && userData.role === 'admin') {
      permissions = {
        user_id: userData.id,
        can_delete_schools: true,
        can_manage_users: true,
        can_assign_training: true,
        can_view_reports: true,
        can_manage_schools: true,
        can_manage_teachers: true,
        can_manage_mentors: true,
        can_manage_admin_personnel: true,
        can_manage_training_programs: true,
      };
      try {
        await db.insertOne('permissions', permissions);
      } catch (e) {
        // Non-critical
      }
    }
    if (!permissions) permissions = {} as Permission;

    const userWithPermissions = { user: userData as User, permissions: permissions as Permission };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithPermissions));
    updateLastActivity();

    const token = await generateToken(userData as User, permissions);
    setStoredToken(token);

    return userWithPermissions;
  } catch (error) {
    console.error('Login error:', error);
    return { user: {} as User, permissions: {} as Permission, error: 'Login failed' };
  }
};

/**
 * Verify phone number — queries Firestore directly from the frontend.
 */
export const verifyPhone = async (phone: string): Promise<{ type: string; data: any; hasPassword: boolean; error?: string } | null> => {
  try {
    const normalizedInput = phone.replace(/\s+/g, '');

    // Helper to search a collection by phone
    const findInCollection = async (collectionName: string) => {
      const all = await db.find<any>(collectionName, {});
      return all.find((doc: any) => {
        const docPhone = (doc.phone || '').replace(/\s+/g, '');
        return docPhone === normalizedInput;
      });
    };

    let userDoc = await findInCollection('mentors');
    let type = 'mentor';

    if (!userDoc) {
      userDoc = await findInCollection('teachers');
      type = 'teacher';
    }

    if (!userDoc) {
      userDoc = await findInCollection('management');
      type = 'management';
    }

    if (!userDoc) {
      return { type: '', data: null, hasPassword: false, error: 'Phone number not found' };
    }

    const hasPassword = !!(userDoc.plain_passcode || userDoc.password_hash || userDoc.passcode);
    return { type, data: userDoc, hasPassword };
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
    const collectionMap: Record<string, string> = {
      teacher: 'teachers',
      mentor: 'mentors',
      management: 'management'
    };
    const collectionName = collectionMap[type];
    if (!collectionName) {
      return { success: false, error: 'Invalid user type' };
    }

    const userData = await db.findById<any>(collectionName, userId);
    if (!userData) {
      return { success: false, error: 'User not found' };
    }

    const storedPasscode = userData.plain_passcode || userData.passcode;
    const hashedInput = await hashPassword(password);
    const isCorrect = (storedPasscode && storedPasscode === password) ||
                      (userData.password_hash && userData.password_hash === hashedInput);

    if (!isCorrect) {
      return { success: false, error: 'Incorrect password' };
    }

    const token = await generateToken(userData as any, null);
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
    const management = await db.findOne<Management>('management', { phone });
    if (!management) {
      return null;
    }
    if (management.status !== 'active') {
      return null;
    }
    localStorage.setItem(MANAGEMENT_STORAGE_KEY, JSON.stringify(management));
    updateLastActivity();

    const token = await generateToken(management as any, null);
    setStoredToken(token);

    return management;
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

const getDefaultPermissions = (userId: string): Permission => ({
  id: '',
  user_id: userId,
  can_delete_schools: false,
  can_manage_users: false,
  can_assign_training: false,
  can_view_reports: false,
  can_manage_schools: false,
  can_manage_teachers: false,
  can_manage_mentors: false,
  can_manage_admin_personnel: false,
  can_manage_training_programs: false,
});

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
