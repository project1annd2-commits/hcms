import { useState, useEffect, useRef } from 'react';
import { User, Permission, Teacher, Mentor, Management, ChatSession, CalendarEvent, SchoolAssignment, School, SchoolFollowup } from './lib/models';
import { getCurrentUser, getCurrentTeacher, getCurrentMentor, getCurrentManagement, logout, checkSessionTimeout, updateLastActivity, signInToFirebaseAuth, isAuthenticated } from './lib/auth';
import { db } from './lib/services/db';
import { Collections } from './lib/constants';
import { getPreferredVoice } from './components/VoiceSummary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TeacherPortal from './components/TeacherPortal';
import MentorPortal from './components/MentorPortal';
import ManagementPortal from './components/ManagementPortal';
import AuditManagement from './components/AuditManagement';
import UserManagement from './components/UserManagement';
import SchoolManagement from './components/SchoolManagement';
import TeacherManagement from './components/TeacherManagement';
import MentorManagement from './components/MentorManagement';
import AdminPersonnelManagement from './components/AdminPersonnelManagement';
import ManagementManagement from './components/ManagementManagement';
import SchoolImplementationChecklist from './components/SchoolImplementationChecklist';
import TrainingProgramManagement from './components/TrainingProgramManagement';
import TrainingAssignmentManagement from './components/TrainingAssignmentManagement';
import BulkUpload from './components/BulkUpload';
import SchoolAssignments from './components/SchoolAssignments';
import DailyAttendanceReport from './components/DailyAttendanceReport';
import EmployeeTasks from './components/EmployeeTasks';
import SchoolFollowups from './components/SchoolFollowups';
import DeviceManagement from './components/DeviceManagement';
import LoginStatistics from './components/LoginStatistics';
import EmployeeChatDashboard from './components/EmployeeChatDashboard';
import QueryTracker from './components/QueryTracker';
import SchoolOnboarding from './components/SchoolOnboarding';
import EventCalendar from './components/EventCalendar';
import InAppNotification from './components/Notification';
import BrandLoader from './components/BrandLoader';
import AcademicsAnalytics from './components/AcademicsAnalytics';
import ThemeChecklistsAnalytics from './components/ThemeChecklistsAnalytics';
import ImplementationAnalytics from './components/ImplementationAnalytics';
import SystemUpgrades from './components/SystemUpgrades';
import YouTubeVideos from './components/YouTubeVideos';



import StudentListing from './components/StudentListing';
import StudentAnalytics from './components/StudentAnalytics';
import CoraCMS from './components/CoraCMS';
import { PermissionsManagement } from './components/PermissionsManagement';
import MomNotesView from './components/MomNotesView';
import TrainingCalendar from './components/TrainingCalendar';
import { getVisibleTabs, View } from './lib/accessControl';

import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  Briefcase,
  BookOpen,
  Target,
  UserCog,
  LogOut,
  Menu,
  X,
  Upload,
  UserCheck,
  Calendar,
  CheckSquare,
  MessageSquare,
  Shield,
  BarChart3,
  LineChart,
  ClipboardList,

  ClipboardCheck,
  Bot,
  RefreshCw,
  Settings,
  Bell,
  Lock,
  FileText,
  Play
} from 'lucide-react';

import ParentPortal from './components/ParentPortal';



export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<Permission | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentMentor, setCurrentMentor] = useState<Mentor | null>(null);
  const [currentManagement, setCurrentManagement] = useState<Management | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentSubTab, setCurrentSubTab] = useState<string | undefined>(undefined);
  const [targetSchoolId, setTargetSchoolId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const previousUnreadCounts = useRef<Record<string, number>>({});
  const previousAssignmentIds = useRef<Set<string>>(new Set());
  const previous100PercentSchools = useRef<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  useEffect(() => {
    const initializeAuth = async () => {
      const isAuth = await isAuthenticated();
      
      if (!isAuth) {
        const hasAnyStoredAuth = getCurrentUser() || getCurrentTeacher() || getCurrentMentor() || getCurrentManagement();
        if (hasAnyStoredAuth) {
          console.warn('Session invalid or expired. Logging out.');
          handleLogout();
        }
        setIsInitializing(false);
        return;
      }

      const storedUser = getCurrentUser();
      if (storedUser) {
        setCurrentUser(storedUser.user);
        setCurrentPermissions(storedUser.permissions);
        signInToFirebaseAuth(storedUser.user.id!, storedUser.user.role || 'admin');
      }

      const storedTeacher = getCurrentTeacher();
      if (storedTeacher) {
        setCurrentTeacher(storedTeacher);
        signInToFirebaseAuth(storedTeacher.id!, 'teacher');
      }

      const storedMentor = getCurrentMentor();
      if (storedMentor) {
        setCurrentMentor(storedMentor);
        signInToFirebaseAuth(storedMentor.id!, 'mentor');
      }

      const storedManagement = getCurrentManagement();
      if (storedManagement) {
        setCurrentManagement(storedManagement);
        signInToFirebaseAuth(storedManagement.id!, 'management');
      }

      // Set initialization to false after a slight delay
      setTimeout(() => {
        setIsInitializing(false);
      }, 2000);
    };

    initializeAuth();
  }, []);


  // Auto-logout after 10 hours of inactivity (employees only, not teachers)
  useEffect(() => {
    // Only run for employees, not teachers
    if (!currentUser || currentTeacher) return;

    // Check session timeout every minute
    const timeoutCheckInterval = setInterval(() => {
      if (checkSessionTimeout()) {
        console.log('Session timed out due to inactivity');
        handleLogout();
      }
    }, 60000); // Check every minute

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      updateLastActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearInterval(timeoutCheckInterval);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentTeacher]);

  // Chat notifications for employees and admins
  useEffect(() => {
    if (!currentUser || currentTeacher) return;
    // Determine queries based on role
    const queries = [];
    if (currentUser.role === 'employee') {
      queries.push({ employee_id: currentUser.id });
    }
    if (currentUser.role === 'admin') {
      queries.push({ type: 'technical_support' });
    }

    if (queries.length === 0) return;

    // Subscribe to each query for notifications
    const unsubscribes = queries.map(query =>
      db.subscribe<ChatSession>(
        Collections.CHAT_SESSIONS,
        query,
        (sessions) => {
          sessions.forEach(session => {
            const prevCount = previousUnreadCounts.current[session.id!] || 0;
            const currentCount = session.unread_count_employee || 0;

            if (currentCount > prevCount) {
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play failed:', e));
              } catch (e) {
                console.error('Error playing sound:', e);
              }

              setNotification({
                isOpen: true,
                type: 'info',
                title: session.type === 'technical_support' ? 'New Support Request' : 'New Message',
                message: session.last_message || 'You have received a new message'
              });
            }
            previousUnreadCounts.current[session.id!] = currentCount;
          });
        }
      )
    );

    // Single subscription for total unread badge count
    const totalCountUnsubscribe = db.subscribe<ChatSession>(
      Collections.CHAT_SESSIONS,
      {},
      (allSessions) => {
        const relevantSessions = allSessions.filter(s =>
          (s.employee_id === currentUser.id) ||
          (currentUser.role === 'admin' && s.type === 'technical_support')
        );
        const total = relevantSessions.reduce((sum, session) => sum + (session.unread_count_employee || 0), 0);
        setTotalUnreadCount(total);
      }
    );

    return () => {
      unsubscribes.forEach(un => un());
      totalCountUnsubscribe();
    };
  }, [currentUser, currentTeacher]);

  // 100% Conversion Notifications
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employee') return;

    // Load initial data to populate ref
    const loadInitialSchools = async () => {
      // Assuming employees can read all schools or at least the ones they need to know about
      const schools = await db.find<School>(Collections.SCHOOLS, {});
      const completedIds = new Set(schools.filter(s => (s.conversion_rate || 0) === 100).map(s => s.id!));
      previous100PercentSchools.current = completedIds;
    };

    loadInitialSchools();

    const unsubscribe = db.subscribe<School>(
      Collections.SCHOOLS,
      {},
      (schools) => {
        const prevIds = previous100PercentSchools.current;
        const newCompleted = schools.filter(s => (s.conversion_rate || 0) === 100 && !prevIds.has(s.id!));

        if (newCompleted.length > 0) {
          // Celebration Sound
          try {
            // Using a cheerful sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
            audio.volume = 0.6;
            audio.play().catch(e => console.log('Audio play failed:', e));
          } catch (e) {
            console.error('Error playing sound:', e);
          }

          const schoolNames = newCompleted.map(s => s.name).join(', ');
          const message = newCompleted.length === 1
            ? `🎉 Amazing! ${schoolNames} has reached 100% Conversion!`
            : `🎉 Amazing! ${newCompleted.length} schools have reached 100% Conversion!`;

          // Show in-app notification
          setNotification({
            isOpen: true,
            type: 'success', // Green for success
            title: '100% Conversion Achieved! 🏆',
            message: message
          });
        }


        // Update Ref
        previous100PercentSchools.current = new Set(schools.filter(s => (s.conversion_rate || 0) === 100).map(s => s.id!));
      }
    );

    return () => unsubscribe();
  }, [currentUser]);
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employee') return;

    // Load initial assignments to populate ref without notifying
    const loadInitialAssignments = async () => {
      const assignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
      const currentIds = new Set(assignments.map(a => a.id!));
      previousAssignmentIds.current = currentIds;
    };

    loadInitialAssignments();

    // Subscribe to changes
    const unsubscribe = db.subscribe<SchoolAssignment>(
      Collections.SCHOOL_ASSIGNMENTS,
      { employee_id: currentUser.id },
      async (assignments) => {
        const currentIds = new Set(assignments.map(a => a.id!));
        const prevIds = previousAssignmentIds.current;

        // Check for new assignments
        const newAssignments = assignments.filter(a => !prevIds.has(a.id!));

        if (newAssignments.length > 0) {
          // Found new assignments!

          // Play sound
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed:', e));
          } catch (e) {
            console.error('Error playing sound:', e);
          }

          // Get school names for better notification
          const schoolNames = await Promise.all(newAssignments.map(async (a) => {
            const school = await db.findById<School>(Collections.SCHOOLS, a.school_id);
            return school?.name || 'Unknown School';
          }));

          const message = newAssignments.length === 1
            ? `You have been assigned to: ${schoolNames[0]}`
            : `You have been assigned to ${newAssignments.length} new schools`;

          // Show in-app notification
          setNotification({
            isOpen: true,
            type: 'info',
            title: 'New School Assignment',
            message: message
          });
        }


        // Update ref
        previousAssignmentIds.current = currentIds;
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Heartbeat to update last seen status (run every 5 minutes)
  useEffect(() => {
    if (!currentUser) return;

    // Initial update on mount/login
    import('./lib/deviceTracking').then(({ updateDeviceLastSeen }) => {
      updateDeviceLastSeen(currentUser.id!);
    });

    const heartbeatInterval = setInterval(() => {
      // Only update if user is still logged in
      if (getCurrentUser()) {
        import('./lib/deviceTracking').then(({ updateDeviceLastSeen }) => {
          updateDeviceLastSeen(currentUser.id!);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(heartbeatInterval);
  }, [currentUser]);

  // Event reminders check
  useEffect(() => {
    if (!currentUser) return;

    const checkReminders = async () => {
      try {
        const events = await db.find<CalendarEvent>(Collections.EVENTS, {
          user_id: currentUser.id,
          status: 'pending'
        });

        const now = new Date();
        events.forEach((event: CalendarEvent) => {
          if (event.reminder_at) {
            const reminderTime = new Date(event.reminder_at);
            // If reminder is within next 5 minutes and hasn't been shown
            const diff = reminderTime.getTime() - now.getTime();
            if (diff > 0 && diff < 5 * 60 * 1000) {
              setNotification({
                isOpen: true,
                type: 'warning',
                title: 'Upcoming Reminder',
                message: `Reminder: ${event.title} starting soon!`
              });
            }
          }
        });

      } catch (error) {
        console.error('Error checking reminders:', error);
      }
    };

    const reminderInterval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(reminderInterval);
  }, [currentUser]);

  // Track view changes
  useEffect(() => {
    if (!currentUser || isInitializing) return;

    db.logActivity({
      user_id: currentUser.id!,
      user_name: currentUser.full_name,
      user_role: currentUser.role,
      action: 'view_change',
      view: currentView
    });
  }, [currentView, currentUser, isInitializing]);

  const speakPendingFollowups = async () => {
    if (!currentUser || currentUser.role !== 'employee' || currentTeacher) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Get assigned schools for this employee
      const assignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id! });
      if (!assignments || assignments.length === 0) return;

      const schoolIds = assignments.map(a => a.school_id);
      let pendingCount = 0;

      // Check each assigned school for pending followups
      for (const schoolId of schoolIds) {
        const followups = await db.find<SchoolFollowup>(Collections.SCHOOL_FOLLOWUPS, {
          school_id: schoolId,
          employee_id: currentUser.id
        });

        // Sort to get latest
        followups.sort((a, b) => new Date(b.followup_date).getTime() - new Date(a.followup_date).getTime());
        const latestFollowup = followups[0];

        const isOverdueBy7Days = latestFollowup?.followup_date ? latestFollowup.followup_date < sevenDaysAgoStr : true;
        const isDueByDate = latestFollowup?.next_followup_date ? latestFollowup.next_followup_date <= today : true;

        if (isDueByDate || isOverdueBy7Days) {
          pendingCount++;
        }
      }

      if (pendingCount > 0) {
        const synth = window.speechSynthesis;
        if (!synth) return;
        synth.cancel();

        const message = pendingCount === 1
          ? "Attention. You have one school followup pending for today."
          : `Attention. You have ${pendingCount} school followups pending for today. Please prioritize these visits.`;

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.95;
        const preferred = await getPreferredVoice();
        if (preferred) utterance.voice = preferred;
        synth.speak(utterance);
      }
    } catch (e) {
      console.error('Error in speakPendingFollowups:', e);
    }
  };

  // Voice notification for pending followups when navigating to the tab
  useEffect(() => {
    if (currentView === 'school-followups' && currentUser?.role === 'employee' && !currentTeacher) {
      speakPendingFollowups();
    }
  }, [currentView]);

  const speakGreeting = async (name: string, role?: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

      // Add formal prefix based on name/role
      let title = '';
      const lowerName = name.toLowerCase();

      // Admin/Management check
      if (lowerName.includes('mujahid') || role === 'admin' || role === 'management') {
        title = lowerName.includes('mujahid') ? 'Mr. ' : '';
      } else if (role === 'employee' || role === 'teacher' || role === 'mentor') {
        // Employee/Teacher/Mentor check (assuming mostly female team based on context: Safa, Zainab, Parveen, Rahila, Ayesha)
        if (lowerName.includes('safa') || lowerName.includes('zainab') || lowerName.includes('parveen') || lowerName.includes('rahila') || lowerName.includes('ayesha') || lowerName.includes('asma')) {
          title = 'Miss ';
        }
      }

      const firstName = name.split(' ')[0];
      const utterance = new SpeechSynthesisUtterance(`${greeting}, ${title}${firstName}. Welcome back!`);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Use saved voice preference, wait for it to load
      const preferred = await getPreferredVoice();
      if (preferred) utterance.voice = preferred;

      synth.speak(utterance);
    } catch (e) {
      console.error('Speech greeting error:', e);
      // Don't let voice errors break the login flow
    }
  };

  const handleLogin = (user: User, permissions: Permission) => {
    console.log('handleLogin called with user:', user, 'permissions:', permissions);
    setCurrentUser(user);
    setCurrentPermissions(permissions);
    db.logActivity({
      user_id: user.id!,
      user_name: user.full_name,
      user_role: user.role,
      action: 'login'
    });
    speakGreeting(user.full_name, user.role);
    console.log('Login completed, state should update');
  };

  const handleTeacherLogin = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    db.logActivity({
      user_id: teacher.id!,
      user_name: `${teacher.first_name} ${teacher.last_name}`,
      user_role: 'teacher',
      action: 'login'
    });
    speakGreeting(`${teacher.first_name} ${teacher.last_name}`, 'teacher');
  };

  const handleMentorLogin = (mentor: Mentor) => {
    setCurrentMentor(mentor);
    db.logActivity({
      user_id: mentor.id!,
      user_name: `${mentor.first_name} ${mentor.last_name}`,
      user_role: 'mentor',
      action: 'login'
    });
    speakGreeting(`${mentor.first_name} ${mentor.last_name}`, 'mentor');
  };

  const handleManagementLogin = (management: Management) => {
    setCurrentManagement(management);
    db.logActivity({
      user_id: management.id!,
      user_name: `${management.first_name} ${management.last_name}`,
      user_role: 'management',
      action: 'login'
    });
    speakGreeting(`${management.first_name} ${management.last_name}`, 'management');
  };

  const handleLogout = () => {
    const user = currentUser || currentTeacher || currentMentor || currentManagement;
    if (user) {
      const role = currentUser ? currentUser.role :
        currentTeacher ? 'teacher' :
          currentMentor ? 'mentor' :
            currentManagement ? 'management' : 'unknown';
      const name = currentUser ? currentUser.full_name :
        currentTeacher ? `${currentTeacher.first_name} ${currentTeacher.last_name}` :
          currentMentor ? `${currentMentor.first_name} ${currentMentor.last_name}` :
            currentManagement ? `${currentManagement.first_name} ${currentManagement.last_name}` : 'Unknown';

      db.logActivity({
        user_id: user.id!,
        user_name: name,
        user_role: role,
        action: 'logout'
      });
    }

    logout();
    setCurrentUser(null);
    setCurrentPermissions(null);
    setCurrentTeacher(null);
    setCurrentMentor(null);
    setCurrentManagement(null);
    setCurrentView('dashboard');
  };


  if (currentTeacher) {
    return <TeacherPortal teacher={currentTeacher} onLogout={handleLogout} />;
  }

  if (currentMentor) {
    return <MentorPortal mentor={currentMentor} onLogout={handleLogout} />;
  }

  if (currentManagement) {
    return <ManagementPortal management={currentManagement} onLogout={handleLogout} />;
  }

  if (currentView === 'parent-portal') {
    return <ParentPortal onBack={() => setCurrentView('dashboard')} />;
  }

  if (!currentUser || !currentPermissions) {
    return (
      <Login
        onLogin={handleLogin}
        onTeacherLogin={handleTeacherLogin}
        onMentorLogin={handleMentorLogin}
        onManagementLogin={handleManagementLogin}
        onParentAccess={() => setCurrentView('parent-portal')}
      />
    );
  }


  if (!currentUser || !currentPermissions) return null;

  const visibleTabIds = getVisibleTabs(currentUser, currentPermissions);

  const navigationItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'mom-notes' as View, label: 'MoM Notes', icon: FileText },
    { id: 'training-calendar' as View, label: 'Training Calendar', icon: Calendar },
    { id: 'calendar' as View, label: 'Event Calendar', icon: Calendar },
    { id: 'my-tasks' as View, label: 'My Tasks', icon: CheckSquare },
    { id: 'messages' as View, label: 'Messages', icon: MessageSquare, badge: totalUnreadCount },
    { id: 'cora-cms' as View, label: 'Cora CMS', icon: Bot, hasBell: true },
    { id: 'academics' as View, label: 'Academics', icon: LineChart },
    { id: 'theme-checklists' as View, label: 'Theme Checklists', icon: ClipboardCheck },
    { id: 'school-followups' as View, label: 'School Followups', icon: MessageSquare },
    { id: 'query-tracker' as View, label: 'Query Tracker', icon: MessageSquare },
    { id: 'school-onboarding' as View, label: 'School Onboarding', icon: ClipboardList },
    { id: 'school-assignments' as View, label: 'School Assignments', icon: UserCheck },
    { id: 'users' as View, label: 'Users', icon: UserCog },
    { id: 'devices' as View, label: 'Device Management', icon: Shield },
    { id: 'login-stats' as View, label: 'Login Statistics', icon: BarChart3 },
    { id: 'audit' as View, label: 'Audit', icon: ClipboardCheck },
    { id: 'schools' as View, label: 'Schools', icon: Building2 },
    { id: 'students' as View, label: 'Students', icon: GraduationCap },
    { id: 'teachers' as View, label: 'Teachers', icon: GraduationCap },
    { id: 'mentors' as View, label: 'Mentors', icon: Users },
    { id: 'management' as View, label: 'Management', icon: Shield },
    { id: 'implementation-checklist' as View, label: 'Implementation Checklist', icon: ClipboardCheck },
    { id: 'personnel' as View, label: 'Personnel', icon: Briefcase },
    { id: 'programs' as View, label: 'Training Programs', icon: BookOpen },
    { id: 'assignments' as View, label: 'Assignments', icon: Target },
    { id: 'implementation-analytics' as View, label: 'Checklist Analytics', icon: BarChart3 },
    { id: 'bulk-upload' as View, label: 'Bulk Upload', icon: Upload },
    { id: 'daily-report' as View, label: 'Daily Attendance Report', icon: Calendar },
    { id: 'upgrades' as View, label: 'Upgrades', icon: RefreshCw },
    { id: 'student-analytics' as View, label: 'Student Analytics', icon: BarChart3 },
    { id: 'youtube-videos' as View, label: 'YouTube Videos', icon: Play },

    { id: 'settings' as View, label: 'Settings', icon: Settings },
    { id: 'permissions' as View, label: 'Permissions', icon: Lock },
  ].filter(item => visibleTabIds.includes(item.id));

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard
          currentUser={currentUser}
          currentPermissions={currentPermissions}
        />;
      case 'calendar':
        return <EventCalendar currentUser={currentUser} />;
      case 'training-calendar':
        return <TrainingCalendar currentUser={currentUser} />;
      case 'my-tasks':
        return <EmployeeTasks currentUser={currentUser} />;
      case 'messages':
        return <EmployeeChatDashboard currentUser={currentUser} />;
      case 'school-followups':
        return <SchoolFollowups
          currentUser={currentUser}
          currentPermissions={currentPermissions}
          initialTab={currentSubTab as 'today' | 'upcoming' | 'history' | 'daily_report' | 'analytics' | 'my-schools' | 'global' | 'add'}
        />;
      case 'users':
        return <UserManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'devices':
        return <DeviceManagement />;
      case 'login-stats':
        return <LoginStatistics />;
      case 'schools':
        return <SchoolManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'students':
        return <StudentListing />;
      case 'cora-cms':
        return <CoraCMS />;
      case 'teachers':
        return <TeacherManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'mentors':
        return <MentorManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'personnel':
        return <AdminPersonnelManagement currentPermissions={currentPermissions} />;
      case 'management':
        return <ManagementManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'implementation-checklist':
        return <SchoolImplementationChecklist
          currentUser={currentUser}
          userType={currentUser.role}
          targetSchoolId={targetSchoolId}
        />;
      case 'programs':
        return <TrainingProgramManagement
          currentUser={currentUser}
          currentPermissions={currentPermissions}
          onNavigateToAssignments={() => setCurrentView('assignments')}
        />;
      case 'assignments':
        return <TrainingAssignmentManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'bulk-upload':
        return <BulkUpload currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'query-tracker':
        return <QueryTracker currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'school-onboarding':
        return <SchoolOnboarding currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'school-assignments':
        return <SchoolAssignments currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'daily-report':
        return <DailyAttendanceReport currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'academics':
        return <AcademicsAnalytics currentUser={currentUser} />;
      case 'theme-checklists':
        return <ThemeChecklistsAnalytics currentUser={currentUser} />;
      case 'audit':
        return <AuditManagement currentUser={currentUser} />;
      case 'implementation-analytics':
        return <ImplementationAnalytics
          currentUser={currentUser}
          onNavigate={(view: View, subTab?: string, targetId?: string) => {
            setCurrentView(view);
            setCurrentSubTab(subTab);
            setTargetSchoolId(targetId);
          }}
        />;
      case 'upgrades':
        return <SystemUpgrades currentUser={currentUser} />;

      case 'permissions':
        return <PermissionsManagement />;
      case 'student-analytics':
        return <StudentAnalytics />;

      case 'youtube-videos':
        return <YouTubeVideos currentUser={currentUser} />;

      case 'mom-notes':
        return <MomNotesView currentUser={currentUser} currentPermissions={currentPermissions} />;

      default:
        return <Dashboard currentUser={currentUser} currentPermissions={currentPermissions} />;
    }
  };

  return (
    <>
      {isInitializing && <BrandLoader />}
      <div className="flex h-screen bg-gray-100">
        <InAppNotification
          isOpen={notification.isOpen}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        />

        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-blue-600 shadow-xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          print:hidden
        `}>
          <div className="flex flex-col h-full text-white">
            <div className="p-8 border-b border-blue-500/30">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h1 className="text-2xl font-black text-white tracking-tighter">HCMS</h1>
                  <p className="text-[10px] text-blue-100 font-bold uppercase tracking-[0.2em] mt-1">Central Management System</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-blue-100 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id as View);
                      setCurrentSubTab(undefined);
                      setTargetSchoolId(undefined);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 group
                      ${isActive
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-blue-50 hover:bg-blue-500/50 hover:text-white'
                      }
                    `}
                  >
                    <Icon size={18} className={`${isActive ? 'text-blue-600' : 'text-blue-100 group-hover:text-white'} transition-colors`} />
                    <span className="font-semibold flex-1 text-left text-sm tracking-tight">{item.label}</span>
                    {(item as { hasBell?: boolean }).hasBell && (
                      <Bell size={14} className={`${isActive ? 'text-blue-600' : 'text-blue-100'} animate-pulse`} />
                    )}
                    {(item as { badge?: number }).badge && (item as { badge?: number }).badge! > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-red-500 text-white shadow-md' : 'bg-red-500 text-white shadow-lg'}`}>
                        {(item as { badge?: number }).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-6 border-t border-blue-500/30">
              <div className="flex items-center gap-3 px-2 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/10">
                  <span className="text-white font-black">{currentUser.full_name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate leading-none mb-1">{currentUser.full_name}</p>
                  <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">{currentUser.role}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100 hover:bg-red-500/20 hover:text-white transition-all duration-300 font-black text-sm uppercase tracking-widest"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between print:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-700 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">HCMS</h2>
            <div className="w-6" />
          </div>

          <div className="p-6 lg:p-8 print:p-0">
            {renderView()}
          </div>
        </main>
      </div>

    </>
  );
}
