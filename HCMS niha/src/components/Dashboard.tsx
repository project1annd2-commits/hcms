import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Permission, User } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Building2, GraduationCap, Users, Target, TrendingUp, AlertCircle, CheckCircle2, Calendar, ArrowUpRight, Clock, Bell, ClipboardCheck, DownloadCloud } from 'lucide-react';
import AttendanceAnalytics from './AttendanceAnalytics';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

interface Stats {
  schools: number;
  teachers: number;
  mentors: number;
  trainingPrograms: number;
  activeAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  completionRate: number;
  pendingFollowups: number;
  implementationProgress: number;
}

interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
}

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

const calculateAutoProgress = (assignment: any): number => {
  if (assignment.status === 'completed') {
    return 100;
  }

  const program = assignment.training_program;
  if (!program?.start_date || !program?.end_date) {
    return assignment.progress_percentage || 0;
  }

  const startDate = new Date(program.start_date);
  const endDate = new Date(program.end_date);
  const today = new Date();

  if (today < startDate) {
    return 0;
  }

  if (today >= endDate) {
    return assignment.status === 'completed' ? 100 : assignment.progress_percentage || 0;
  }

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const autoProgress = Math.round((daysPassed / totalDays) * 100);

  return Math.min(100, Math.max(0, autoProgress));
};

export default function Dashboard({ currentUser, currentPermissions }: Props) {
  const [stats, setStats] = useState<Stats>({
    schools: 0,
    teachers: 0,
    mentors: 0,
    trainingPrograms: 0,
    activeAssignments: 0,
    completedAssignments: 0,
    overdueAssignments: 0,
    completionRate: 0,
    pendingFollowups: 0,
    implementationProgress: 0,
  });
  const [schoolImplementationData, setSchoolImplementationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingFollowupSchools, setPendingFollowupSchools] = useState<any[]>([]);
  const [schoolAssignmentChartData, setSchoolAssignmentChartData] = useState<any[]>([]);
  const [followupActivityChartData, setFollowupActivityChartData] = useState<any[]>([]);

  const canViewReports = currentPermissions.can_view_reports;
  const isAdminOrEmployee = currentUser.role === 'admin' || currentUser.role === 'employee';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];
      let userAssignments: any[] = [];

      if (currentUser.role !== 'admin' && currentUser.id) {
        console.log('[Dashboard] Fetching assignments for employee:', currentUser.id);
        userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        console.log('[Dashboard] User assignments found:', userAssignments?.length || 0, userAssignments);
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
        console.log('[Dashboard] Assigned school IDs:', assignedSchoolIds);
      }

      // Build filters for role-based access
      let schoolFilter = {};
      let teacherFilter = {};
      let mentorFilter = {};

      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        schoolFilter = { id: { $in: assignedSchoolIds } };
        teacherFilter = { school_id: { $in: assignedSchoolIds } };
        mentorFilter = { school_id: { $in: assignedSchoolIds } };
        console.log('[Dashboard] Using school filter:', schoolFilter);
      } else if (currentUser.role !== 'admin') {
        // No access if not admin and no assigned schools
        schoolFilter = { id: 'none' };
        teacherFilter = { id: 'none' };
        mentorFilter = { id: 'none' };
        console.log('[Dashboard] No assignments found, using restrictive filter');
      }

      // Fetch all school assignments to calculate global distribution and assigned counts
      const allSchoolAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, {});
      const uniqueAssignedSchoolIds = new Set(allSchoolAssignments.map((a: any) => a.school_id));

      const [
        teachersData,
        mentorsData,
        programsData,
        assignmentsData,
        allSchoolsData,
        checklistData
      ] = await Promise.all([
        db.find(Collections.TEACHERS, teacherFilter),
        db.find(Collections.MENTORS, mentorFilter),
        db.find(Collections.TRAINING_PROGRAMS, {}),  // Fetch ALL training programs
        db.find(Collections.TRAINING_ASSIGNMENTS, {}),
        db.find(Collections.SCHOOLS, {}),
        db.find('implementation_checklists', {})
      ]);

      // Count assigned schools:
      // For admin: count unique school_ids in all assignments
      // For employees: their own assigned school count
      const schools = currentUser.role === 'admin'
        ? uniqueAssignedSchoolIds.size
        : userAssignments.length;

      const teachers = teachersData.length;
      const mentors = mentorsData.length;
      const programs = programsData.length;

      // Load programs for assignments to calculate progress
      const allPrograms = await db.find(Collections.TRAINING_PROGRAMS, {});
      const assignments = assignmentsData.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      const activeAssignments = assignments.filter((a: any) => a.status === 'in_progress' || a.status === 'assigned').length;
      const completedAssignments = assignments.filter((a: any) => a.status === 'completed').length;
      const overdueAssignments = assignments.filter((a: any) => a.status === 'overdue').length;

      const totalAutoProgress = assignments.reduce((sum: number, assignment: any) => {
        const progress = calculateAutoProgress(assignment);
        return sum + progress;
      }, 0);
      const completionRate = assignments.length > 0 ? Math.round(totalAutoProgress / assignments.length) : 0;

      const today = getLocalDate();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = getLocalDate(sevenDaysAgo);

      // Fetch latest followup for each assigned school to check the 7-day rule
      const rawFollowups = await db.find(
        Collections.SCHOOL_FOLLOWUPS,
        { employee_id: currentUser.id }
      );

      // Manual sort since DB sort might be unreliable in this environment
      const allFollowups = [...(rawFollowups || [])].sort((a: any, b: any) => {
        const dateA = (a.followup_date as string) || '';
        const dateB = (b.followup_date as string) || '';
        return dateB.localeCompare(dateA);
      });

      const schoolMap = new Map();
      allSchoolsData?.forEach((s: any) => schoolMap.set(s.id, s));

      const schoolLatestFollowup = new Map();
      allFollowups?.forEach((f: any) => {
        // Identify the canonical UUID for the school this followup belongs to
        const school = allSchoolsData.find((s: any) => s.id === f.school_id || s.code === f.school_id);
        const canonicalId = school ? school.id : f.school_id;

        if (!schoolLatestFollowup.has(canonicalId)) {
          schoolLatestFollowup.set(canonicalId, f);
        }
      });

      const schoolsNeedingFollowupIds: string[] = [];
      assignedSchoolIds.forEach(schoolId => {
        const school = schoolMap.get(schoolId);
        if (!school) return;

        // Map is already indexed by canonical UUID
        const latest = schoolLatestFollowup.get(schoolId);

        // Case 1: No followup ever recorded for this school
        if (!latest) {
          // Only show if the school was created more than 7 days ago
          const createdDate = school.created_at ? school.created_at.split('T')[0] : null;
          if (createdDate && (!createdDate || createdDate < sevenDaysAgoStr)) {
            schoolsNeedingFollowupIds.push(schoolId);
          }
          return;
        }

        // Case 2: next_followup_date is set and has passed
        if (latest.next_followup_date && latest.next_followup_date <= today) {
          schoolsNeedingFollowupIds.push(schoolId);
          return;
        }

        // Case 3: next_followup_date is NOT set (or is in the future), but last followup was > 7 days ago
        const isOverdueBy7Days = latest.followup_date && latest.followup_date < sevenDaysAgoStr;
        const hasNoFutureDate = !latest.next_followup_date || latest.next_followup_date <= today;
        if (isOverdueBy7Days && hasNoFutureDate) {
          schoolsNeedingFollowupIds.push(schoolId);
        }
      });

      const pendingFollowups = schoolsNeedingFollowupIds.length;

      const schoolsNeedingFollowup = schoolsNeedingFollowupIds.length > 0
        ? await db.find(
          Collections.SCHOOLS,
          { id: { $in: schoolsNeedingFollowupIds.slice(0, 5) } }
        )
        : [];

      setPendingFollowupSchools(schoolsNeedingFollowup || []);

      setStats({
        schools,
        teachers,
        mentors,
        trainingPrograms: programs,
        activeAssignments,
        completedAssignments,
        overdueAssignments,
        completionRate,
        pendingFollowups,
        implementationProgress: 0, // Will update below
      });

      // Calculate Implementation Progress
      const getSchoolProgress = (schoolId: string, checklists: any[]) => {
        const checklist = checklists.find(c => c.school_id === schoolId);
        if (!checklist?.items) return 0;
        const total = 9; // total checklist items
        const completed = Object.values(checklist.items).filter(Boolean).length;
        return Math.round((completed / total) * 100);
      };

      const implementationStats = allSchoolsData.map((s: any) => ({
        name: s.name,
        progress: getSchoolProgress(s.id, checklistData)
      })).sort((a, b) => b.progress - a.progress);

      const avgImplProgress = implementationStats.length > 0
        ? Math.round(implementationStats.reduce((sum, s) => sum + s.progress, 0) / implementationStats.length)
        : 0;

      setSchoolImplementationData(implementationStats.slice(0, 5));
      setStats(prev => ({
        ...prev,
        implementationProgress: avgImplProgress
      }));

      const activity: RecentActivity[] = [];

      // Load recent schools
      let recentSchoolsFilter = {};
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        recentSchoolsFilter = { id: { $in: assignedSchoolIds } };
      } else if (currentUser.role !== 'admin') {
        recentSchoolsFilter = { id: 'none' };
      }

      const recentSchools = await db.find(
        Collections.SCHOOLS,
        recentSchoolsFilter,
        { sort: { created_at: -1 }, limit: 3 }
      );

      recentSchools?.forEach((school: any) => {
        activity.push({
          type: 'school',
          description: `New school added: ${school.name}`,
          timestamp: school.created_at,
        });
      });

      // Load recent teachers
      let recentTeachersFilter = {};
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        recentTeachersFilter = { school_id: { $in: assignedSchoolIds } };
      } else if (currentUser.role !== 'admin') {
        recentTeachersFilter = { id: 'none' };
      }

      const recentTeachers = await db.find(
        Collections.TEACHERS,
        recentTeachersFilter,
        { sort: { created_at: -1 }, limit: 3 }
      );

      recentTeachers?.forEach((teacher: any) => {
        activity.push({
          type: 'teacher',
          description: `New teacher added: ${teacher.first_name} ${teacher.last_name}`,
          timestamp: teacher.created_at,
        });
      });

      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 5));

      // Fetch School Assignments for Chart
      // Reuse the allSchoolAssignments we fetched earlier
      const schoolAssignmentsData = allSchoolAssignments;

      // Fetch Employees for names
      const employeesData = await db.find(Collections.USERS, { role: 'employee' });

      // Process Data
      const groupedByEmployee = schoolAssignmentsData.reduce((acc: any, assignment: any) => {
        const employeeId = assignment.employee_id;
        if (!acc[employeeId]) {
          acc[employeeId] = {
            employee: employeesData.find((e: any) => e.id === employeeId),
            count: 0,
            schoolIds: []
          };
        }
        acc[employeeId].count++;
        acc[employeeId].schoolIds.push(assignment.school_id);
        return acc;
      }, {});

      // Fetch all teachers to count per employee
      const allTeachersData = await db.find(Collections.TEACHERS, {});

      const chartData = Object.entries(groupedByEmployee).map(([, data]: [string, any]) => {
        // Count teachers from schools assigned to this employee
        const teacherCount = allTeachersData.filter((t: any) => data.schoolIds.includes(t.school_id)).length;
        return {
          name: data.employee?.full_name || 'Unknown',
          value: data.count,
          teachers: teacherCount,
        };
      }).filter((item: any) => item.value > 0);

      setSchoolAssignmentChartData(chartData);

      // --- Followup Activity Chart Data (9 AM - 5 PM) ---
      // Fetch all followups from TODAY to show activity distribution
      const todayFollowups = await db.find(Collections.SCHOOL_FOLLOWUPS, {
        followup_date: today
      });

      // Filter out Suhail and calculate activity for others
      const validEmployees = employeesData.filter((emp: any) =>
        !emp.full_name.toLowerCase().includes('suhail')
      );

      const employeeActivityCounts = validEmployees.map((emp: any) => {
        const count = todayFollowups.filter((f: any) => f.employee_id === emp.id).length;
        return { emp, count };
      });

      // Selection logic:
      // 1. Always prioritize 'Asma Ayesha' if she exists
      // 2. Fill the rest with top active employees until we have 5
      const asma = employeeActivityCounts.find(item => item.emp.full_name.toLowerCase().includes('asma ayesha'));
      const others = employeeActivityCounts
        .filter(item => !item.emp.full_name.toLowerCase().includes('asma ayesha'))
        .sort((a, b) => b.count - a.count);

      const top5List: any[] = [];
      if (asma) top5List.push(asma.emp);

      // Add others until 5 or until we run out
      for (let i = 0; i < others.length && top5List.length < 5; i++) {
        top5List.push(others[i].emp);
      }

      const hours = Array.from({ length: 9 }, (_, i) => i + 9); // 9 AM to 5 PM
      const activityData = hours.map(hour => {
        const dataPoint: any = {
          time: `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`,
        };

        // Add count for each person in our top 5 list
        top5List.forEach((emp: any) => {
          const count = todayFollowups.filter((f: any) => {
            const date = new Date(f.created_at);
            return date.getHours() === hour && f.employee_id === emp.id;
          }).length;
          dataPoint[emp.full_name] = count;
        });

        return dataPoint;
      });

      setFollowupActivityChartData(activityData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }

    setLoading(false);
  };

  if (loading) {
    return <LoadingSpinner label="Loading Dashboard" />;
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {currentUser.full_name}!</h1>
            <p className="text-blue-100 flex items-center gap-2">
              <Clock size={16} />
              {currentDate}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
            {currentUser.role === 'admin' && (
              <button 
                onClick={() => window.open(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/backup` : 'http://localhost:5000/api/backup', '_blank')}
                className="bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm rounded-lg px-4 py-3 flex items-center gap-3"
                title="Ensure your local or remote backend server is running to download the backup"
              >
                <DownloadCloud className="text-white" size={24} />
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">Download Backup</p>
                  <p className="text-xs font-light tracking-wide text-blue-100 opacity-90">Full JSON Structure</p>
                </div>
              </button>
            )}
            {stats.pendingFollowups > 0 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center gap-3">
                <Bell className="text-yellow-300" size={24} />
                <div>
                  <p className="text-sm font-medium">Followups</p>
                  <p className="text-2xl font-bold">{stats.pendingFollowups}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid with Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Schools Card */}
        <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <Building2 size={28} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm font-medium text-blue-100 mb-1">Assigned Schools</p>
            <p className="text-4xl font-bold">{stats.schools}</p>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <GraduationCap size={28} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm font-medium text-green-100 mb-1">Teachers</p>
            <p className="text-4xl font-bold">{stats.teachers}</p>
          </div>
        </div>

        {/* Mentors Card */}
        <div className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <Users size={28} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm font-medium text-purple-100 mb-1">Mentors</p>
            <p className="text-4xl font-bold">{stats.mentors}</p>
          </div>
        </div>

        {/* Implementation Progress Card */}
        <div className="group relative bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                <ClipboardCheck size={28} />
              </div>
              <ArrowUpRight size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm font-medium text-indigo-100 mb-1">Implementation Progress</p>
            <p className="text-4xl font-bold">{stats.implementationProgress}%</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Assignments Chart */}
        {schoolAssignmentChartData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 size={24} className="text-blue-600" />
              School Assignments Distribution
            </h3>
            <div className="h-[300px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={schoolAssignmentChartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={12} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Schools" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teachers" name="Teachers" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Followup Activity Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={24} className="text-orange-600" />
            Followup Activity
          </h3>
          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={followupActivityChartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                {Object.keys(followupActivityChartData[0] || {})
                  .filter(key => key !== 'time')
                  .map((employeeName, index) => (
                    <Line
                      key={employeeName}
                      type="monotone"
                      dataKey={employeeName}
                      stroke={[
                        '#6366f1', // indigo
                        '#f59e0b', // amber
                        '#10b981', // emerald
                        '#a855f7', // purple
                        '#ef4444', // red
                        '#3b82f6', // blue
                      ][index % 6]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pending Followups Alert */}
      {stats.pendingFollowups > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6 shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-lg shadow-lg">
                <Calendar className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Schools Need Followup</h3>
                <p className="text-gray-600 mt-1">You have {stats.pendingFollowups} school(s) requiring attention today</p>
              </div>
            </div>
            <span className="bg-gradient-to-br from-orange-600 to-red-600 text-white text-lg font-bold px-4 py-2 rounded-full shadow-lg">
              {stats.pendingFollowups}
            </span>
          </div>
          {pendingFollowupSchools.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {pendingFollowupSchools.map((school) => (
                <div key={school.id} className="bg-white rounded-lg p-4 border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-bold text-gray-900">{school.name}</p>
                  <p className="text-sm text-gray-500 mt-1">Code: {school.code}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canViewReports && (
        <>
          {/* Assignment Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Target className="text-blue-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Active Assignments</h3>
              </div>
              <p className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">{stats.activeAssignments}</p>
              <p className="text-sm text-gray-600 mt-2">In progress or assigned</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Completed</h3>
              </div>
              <p className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-400 bg-clip-text text-transparent">{stats.completedAssignments}</p>
              <p className="text-sm text-gray-600 mt-2">Successfully finished</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-red-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Overdue</h3>
              </div>
              <p className="text-5xl font-bold bg-gradient-to-r from-red-600 to-pink-400 bg-clip-text text-transparent">{stats.overdueAssignments}</p>
              <p className="text-sm text-gray-600 mt-2">Require attention</p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-lg shadow-lg">
                <TrendingUp className="text-white" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Average Training Progress</h3>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-10 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${stats.completionRate}%` }}
                  >
                    {stats.completionRate > 15 && `${stats.completionRate}%`}
                  </div>
                </div>
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{stats.completionRate}%</div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Based on training duration and time elapsed • {stats.completedAssignments} completed
            </p>
          </div>
        </>
      )}

      {isAdminOrEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceAnalytics />
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardCheck size={24} className="text-indigo-600" />
                Top School Implementation
              </h3>
              <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                Avg: {stats.implementationProgress}%
              </div>
            </div>
            <div className="space-y-6">
              {schoolImplementationData.map((school, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-800">{school.name}</span>
                    <span className="font-black text-indigo-600">{school.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-50">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                        school.progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                        school.progress > 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                        'bg-gradient-to-r from-orange-400 to-red-500'
                      }`}
                      style={{ width: `${school.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {schoolImplementationData.length === 0 && (
                <div className="text-center py-12 text-gray-500 italic">
                  No implementation data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Timeline */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Clock size={24} className="text-blue-600" />
          Recent Activity
        </h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg hover:shadow-md transition-all border border-gray-200">
                <div className={`p-3 rounded-lg shadow-md ${activity.type === 'school'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
                  {activity.type === 'school' ? (
                    <Building2 className="text-white" size={20} />
                  ) : (
                    <GraduationCap className="text-white" size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Clock className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
