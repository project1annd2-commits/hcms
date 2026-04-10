import { User, Permission } from './models';

// Employees restricted to only these 3 tabs (matched by full_name or username, case-insensitive)
const RESTRICTED_EMPLOYEE_NAMES = ['mujahid', 'khatija', 'tanzila'];

// Tabs visible to restricted employees
const RESTRICTED_EMPLOYEE_TABS: View[] = [
  'calendar',
  'my-tasks',
];

// Employees who should NOT see theme-checklists
const NO_THEME_CHECKLIST_NAMES = ['parveen', 'zainab'];

// Employees who should NOT see the students tab
const NO_STUDENTS_NAMES = ['safa'];

// Ameena Fathima's specific tabs
const AMEENA_FATHIMA_NAMES = ['ameena fathima', 'ameena', 'fathima'];
const AMEENA_FATHIMA_TABS: View[] = [
  'dashboard',
  'my-tasks',
  'mom-notes',
  'messages',
];


export type View =
  | 'dashboard'
  | 'calendar'
  | 'my-tasks'
  | 'messages'
  | 'cora-cms'
  | 'academics'
  | 'theme-checklists'
  | 'school-followups'
  | 'query-tracker'
  | 'school-onboarding'
  | 'school-assignments'
  | 'users'
  | 'devices'
  | 'login-stats'
  | 'audit'
  | 'schools'
  | 'students'
  | 'teachers'
  | 'mentors'
  | 'management'
  | 'implementation-checklist'
  | 'personnel'
  | 'programs'
  | 'assignments'
  | 'implementation-analytics'
  | 'bulk-upload'
  | 'daily-report'
  | 'upgrades'
  | 'activity-logs'
  | 'student-analytics'
  | 'followup-analytics'
  | 'settings'
  | 'permissions'
  | 'parent-portal'
  | 'mom-notes'
  | 'training-calendar'
  | 'youtube-videos';

// Admin gets all tabs
const ADMIN_TABS: View[] = [
  'dashboard', 'calendar', 'my-tasks', 'messages', 'cora-cms',
  'academics', 'theme-checklists', 'school-followups', 'query-tracker',
  'school-onboarding', 'school-assignments', 'users', 'devices',
  'login-stats', 'audit', 'schools', 'teachers', 'mentors',
  'management', 'implementation-checklist', 'personnel', 'programs',
  'assignments', 'implementation-analytics', 'bulk-upload', 'daily-report',
  'upgrades', 'activity-logs', 'student-analytics', 'students',
  'settings', 'permissions', 'mom-notes', 'training-calendar', 'youtube-videos'
];

// Employee gets a subset
const EMPLOYEE_TABS: View[] = [
  'dashboard', 'training-calendar', 'my-tasks', 'messages', 'cora-cms',
  'theme-checklists', 'school-followups', 'query-tracker',
  'schools', 'teachers', 'mentors', 'management',
  'implementation-checklist', 'programs', 'assignments',
  'implementation-analytics', 'daily-report', 'mom-notes', 'youtube-videos'
];

// Viewer gets minimal access
const VIEWER_TABS: View[] = [
  'dashboard', 'training-calendar', 'academics', 'theme-checklists',
  'schools', 'teachers', 'mentors', 'daily-report', 'mom-notes'
];

// Employees who should see school-onboarding tab even if not in restricted list
const ONBOARDING_EMPLOYEE_NAMES = ['ayesha', 'asma', 'rahila', 'rahia', 'akhil', 'mujahid', 'khatija'];

export function isAsmaAyesha(user: User): boolean {
  const nameToCheck = [
    (user.username || '').toLowerCase(),
    (user.full_name || '').toLowerCase(),
  ];
  return nameToCheck.some(name => name.includes('asma ayesha') || (name.includes('asma') && name.includes('ayesha')));
}

export function getVisibleTabs(user: User, _permissions: Permission): View[] {
  // Check for restricted employees first (by username or full_name)
  const nameToCheck = [
    (user.username || '').toLowerCase(),
    (user.full_name || '').toLowerCase(),
  ];
  const isRestricted = RESTRICTED_EMPLOYEE_NAMES.some(restricted =>
    nameToCheck.some(name => name.includes(restricted))
  );

  const isAmeenaFathima = AMEENA_FATHIMA_NAMES.some(restricted =>
    nameToCheck.some(name => name.includes(restricted))
  );

  let tabs: View[] = [];

  if (isAmeenaFathima) {
    tabs = [...AMEENA_FATHIMA_TABS];
  } else if (isRestricted) {
    tabs = [...RESTRICTED_EMPLOYEE_TABS];
  } else if (user.role === 'admin') {
    tabs = [...ADMIN_TABS];
  } else if (user.role === 'employee') {
    tabs = [...EMPLOYEE_TABS];
  } else if (user.role === 'viewer') {
    tabs = [...VIEWER_TABS];
  } else {
    tabs = ['dashboard'];
  }

  // Add school-onboarding for specific employees if not already there
  const shouldShowOnboarding = ONBOARDING_EMPLOYEE_NAMES.some(restricted =>
    nameToCheck.some(name => name.toLowerCase().includes(restricted.toLowerCase()))
  );

  if (shouldShowOnboarding && !tabs.includes('school-onboarding')) {
    tabs.push('school-onboarding');
  }

  // Special handling for Asma Ayesha: Show School Assignments
  if (isAsmaAyesha(user) && !tabs.includes('school-assignments')) {
    tabs.push('school-assignments');
  }

  // Filter out theme-checklists for specific users
  const hideThemeChecklist = NO_THEME_CHECKLIST_NAMES.some(restricted =>
    nameToCheck.some(name => name.includes(restricted))
  );

  if (hideThemeChecklist) {
    tabs = tabs.filter(t => t !== 'theme-checklists');
  }

  // Filter out students tab for specific users
  const hideStudents = NO_STUDENTS_NAMES.some(restricted =>
    nameToCheck.some(name => name.includes(restricted))
  );

  if (hideStudents) {
    tabs = tabs.filter(t => t !== 'students');
  }

  return tabs;
}