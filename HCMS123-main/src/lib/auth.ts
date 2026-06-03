import { User, Permission, Teacher, Mentor, Management } from './models';
import { db } from './services/db';
import { trackDeviceLogin } from './deviceTracking';

const STORAGE_KEY = 'hcms_current_user';
const TEACHER_STORAGE_KEY = 'hcms_current_teacher';
const MENTOR_STORAGE_KEY = 'hcms_current_mentor';
const MANAGEMENT_STORAGE_KEY = 'hcms_current_management';
const LAST_ACTIVITY_KEY = 'hcms_last_activity';
const INACTIVITY_TIMEOUT = 10 * 60 * 60 * 1000; // 10 hours in milliseconds

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const login = async (username: string, password: string): Promise<{ user: User; permissions: Permission; error?: string } | null> => {
  try {
    const user = await db.findOne<User>('users', { username });
    if (!user) {
      return { user: {} as User, permissions: {} as Permission, error: 'Invalid username or password' };
    }
    const hashedPassword = await hashPassword(password);
    if (user.password_hash !== hashedPassword) {
      return { user: {} as User, permissions: {} as Permission, error: 'Invalid username or password' };
    }
    if (!user.is_active) {
      return { user: {} as User, permissions: {} as Permission, error: 'Account is inactive' };
    }
    let permissions = await db.findOne<Permission>('permissions', { user_id: user.id });
    if (!permissions) {
      permissions = getDefaultPermissions(user.id!);
    }
    const deviceCheck = await trackDeviceLogin(user.id!);
    if (!deviceCheck.allowed) {
      return { user, permissions, error: deviceCheck.reason };
    }
    const userWithPermissions = { user, permissions };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithPermissions));
    updateLastActivity();
    return userWithPermissions;
  } catch (error: any) {
    console.error('Login error:', error);
    return { user: {} as User, permissions: {} as Permission, error: error.message || 'Login failed' };
  }
};

export const teacherLogin = async (phone: string): Promise<Teacher | null> => {
  try {
    const teacher = await db.findOne<Teacher>('teachers', { phone });
    if (!teacher) {
      return null;
    }
    localStorage.setItem(TEACHER_STORAGE_KEY, JSON.stringify(teacher));
    updateLastActivity();
    return teacher;
  } catch (error) {
    console.error('Teacher login error:', error);
    return null;
  }
};

export const mentorLogin = async (phone: string): Promise<Mentor | null> => {
  try {
    const mentor = await db.findOne<Mentor>('mentors', { phone });
    if (!mentor) {
      return null;
    }
    if (mentor.status !== 'active') {
      return null;
    }
    localStorage.setItem(MENTOR_STORAGE_KEY, JSON.stringify(mentor));
    updateLastActivity();
    return mentor;
  } catch (error) {
    console.error('Mentor login error:', error);
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
    return management;
  } catch (error) {
    console.error('Management login error:', error);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TEACHER_STORAGE_KEY);
  localStorage.removeItem(MENTOR_STORAGE_KEY);
  localStorage.removeItem(MANAGEMENT_STORAGE_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
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
