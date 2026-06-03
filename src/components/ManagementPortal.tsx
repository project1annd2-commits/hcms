import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/services/db';
import {
  Management,
  School,
  Teacher,
  Mentor,
  Student,
  TrainingAssignment,
  TrainingAttendance,
  TrainingProgram
} from '../lib/models';
import { Collections } from '../lib/constants';
import {
  Building2,
  Users,
  GraduationCap,
  LogOut,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
  UserCheck,
  Calendar as CalendarIcon,
  AlertCircle,
  ChevronRight,
  Target,
  LayoutDashboard,
  ClipboardCheck
} from 'lucide-react';
import StudentManager from './StudentManager';
import SchoolImplementationChecklist from './SchoolImplementationChecklist';

interface Props {
  management: Management;
  onLogout: () => void;
}

export default function ManagementPortal({ management, onLogout }: Props) {
  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [trainingData, setTrainingData] = useState<{
    assignments: (TrainingAssignment & { teacher_name: string; program_title: string })[];
    attendance: TrainingAttendance[];
  }>({ assignments: [], attendance: [] });
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ count: number; success: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'checklist'>('dashboard');

  useEffect(() => {
    loadPortalData();
  }, [management.school_id]);

  const loadPortalData = async () => {
    if (!management.school_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const [
        schoolData,
        teachersData,
        mentorsData,
        studentsData,
        checklistsData,
        allAssignments,
        allPrograms
      ] = await Promise.all([
        db.findById<School>(Collections.SCHOOLS, management.school_id),
        db.find<Teacher>(Collections.TEACHERS, { school_id: management.school_id }),
        db.find<Mentor>(Collections.MENTORS, { school_id: management.school_id }),
        db.find<Student>(Collections.STUDENTS, { school_id: management.school_id }),
        db.find<any>('implementation_checklists', { school_id: management.school_id }),
        db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, {}),
        db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {})
      ]);

      setSchool(schoolData);
      setTeachers(teachersData);
      setMentors(mentorsData);
      setStudents(studentsData);
      setChecklists(checklistsData);

      // Filter and enrich training data
      const teacherIds = teachersData.map((t: Teacher) => t.id);
      const schoolAssignments = allAssignments
        .filter((a: TrainingAssignment) => teacherIds.includes(a.teacher_id))
        .map((a: TrainingAssignment) => ({
          ...a,
          teacher_name: teachersData.find((t: Teacher) => t.id === a.teacher_id)?.first_name + ' ' + teachersData.find((t: Teacher) => t.id === a.teacher_id)?.last_name,
          program_title: allPrograms.find((p: TrainingProgram) => p.id === a.training_program_id)?.title || 'Unknown Program'
        }));

      // Optimized attendance fetching
      const schoolAttendance = teacherIds.length > 0 
        ? await db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, { teacher_id: { $in: teacherIds } })
        : [];

      setTrainingData({
        assignments: schoolAssignments,
        attendance: schoolAttendance
      });

    } catch (error) {
      console.error('Error loading portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const h1 = students.filter(s => s.grade === 'H1').length;
    const h2 = students.filter(s => s.grade === 'H2').length;
    const h3 = students.filter(s => s.grade === 'H3').length;

    const checklist = checklists[0];
    let checklistProgress = 0;
    if (checklist?.items) {
      const items = Object.values(checklist.items) as any[];
      const totalPossible = items.length * 10; // assuming max weightage 10
      const totalObtained = items.reduce((acc, curr) => acc + (curr.current_weightage || 0), 0);
      checklistProgress = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;
    }

    const trainingCompletion = trainingData.assignments.length > 0
      ? Math.round((trainingData.assignments.filter(a => a.status === 'completed').length / trainingData.assignments.length) * 100)
      : 0;

    return {
      teacherCount: teachers.length,
      mentorCount: mentors.length,
      studentCount: students.length,
      h1, h2, h3,
      checklistProgress,
      trainingCompletion
    };
  }, [teachers, mentors, students, checklists, trainingData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold animate-pulse">Initializing Management Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Premium Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Building2 size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{school?.name || 'School Portal'}</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{management.position} • {management.department}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <LayoutDashboard size={14} />
                DASHBOARD
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'students'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <GraduationCap size={14} />
                STUDENTS
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'checklist'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <ClipboardCheck size={14} />
                IMPLEMENTATION
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right mr-4">
              <p className="text-sm font-bold text-slate-900">{management.first_name} {management.last_name}</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Authorized Access</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">
        {activeTab === 'dashboard' ? (
          <>
            {/* Migration Alert - Only shown if there are students without roll numbers */}
            {students.some(s => !s.roll_number) && !migrationResult && (
              <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Legacy Students Detected</h4>
                    <p className="text-xs text-amber-700">Some students are missing unique roll numbers. Initialize them now for full Parent Portal compatibility.</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      setMigrating(true);
                      const result = await db.initializeRollNumbers();
                      setMigrationResult(result);
                      await loadPortalData();
                    } catch (error) {
                      console.error('Migration failed:', error);
                    } finally {
                      setMigrating(false);
                    }
                  }}
                  disabled={migrating}
                  className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    migrating 
                      ? 'bg-amber-200 text-amber-400 cursor-not-allowed' 
                      : 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200'
                  }`}
                >
                  {migrating ? 'Fixing...' : 'Fix Roll Numbers Now'}
                </button>
              </div>
            )}

            {migrationResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Fix Complete!</h4>
                  <p className="text-xs text-emerald-700">{migrationResult.count} students were successfully assigned unique roll numbers.</p>
                </div>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Academic Staff</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.teacherCount + stats.mentorCount}</h3>
                    <p className="text-[10px] font-bold text-blue-600 mt-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                      {stats.teacherCount} Teachers & {stats.mentorCount} Mentors
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Users size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Enrollment</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.studentCount}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-bold er">H1: {stats.h1}</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-bold er">H2: {stats.h2}</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-bold er">H3: {stats.h3}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <GraduationCap size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Quality Standards</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.checklistProgress}%</h3>
                    <div className="mt-2 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.checklistProgress}%` }}></div>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <CheckCircle2 size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Training Mastery</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stats.trainingCompletion}%</h3>
                    <p className="text-[10px] font-bold text-amber-600 mt-2">Proficiency Index</p>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-8">
                {/* Training Attendance List */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 uppercase">Staff Learning Progress</h2>
                        <p className="text-xs font-bold text-slate-400">Current training assignments & reliability</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 uppercase tracking-widest">
                      <Clock size={14} className="text-indigo-500" />
                      Real-time
                    </div>
                  </div>

                  <div className="space-y-4">
                    {trainingData.assignments.length > 0 ? (
                      trainingData.assignments.slice(0, 5).map(assignment => (
                        <div key={assignment.id} className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 border border-slate-100 shadow-sm transition-colors">
                            <UserCheck size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{assignment.teacher_name}</h4>
                            <p className="text-[11px] font-bold text-slate-400 truncate ">{assignment.program_title}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-900">{assignment.progress_percentage}%</p>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              assignment.status === 'completed' ? 'text-emerald-500' : 'text-blue-500'
                            }`}>
                              {assignment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="w-1.5 h-12 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full transition-all duration-1000 ${
                                assignment.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'
                              }`} 
                              style={{ height: `${assignment.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle size={32} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-400">No active training assignments found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Students Overview */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[10rem] -mr-32 -mt-32 -z-0"></div>
                   <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                          <GraduationCap size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 uppercase">Student Demographics</h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Grade H1</p>
                        <h4 className="text-3xl font-bold text-blue-900">{stats.h1}</h4>
                        <p className="text-[10px] font-bold text-blue-700/60 mt-2 uppercase">Students Enrolled</p>
                      </div>
                      <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Grade H2</p>
                        <h4 className="text-3xl font-bold text-indigo-900">{stats.h2}</h4>
                        <p className="text-[10px] font-bold text-indigo-700/60 mt-2 uppercase">Students Enrolled</p>
                      </div>
                      <div className="p-6 bg-purple-50/50 rounded-[2rem] border border-purple-100/50">
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Grade H3</p>
                        <h4 className="text-3xl font-bold text-purple-900">{stats.h3}</h4>
                        <p className="text-[10px] font-bold text-purple-700/60 mt-2 uppercase">Students Enrolled</p>
                      </div>
                    </div>
                   </div>
                </div>
              </div>

              {/* Side Panels */}
              <div className="space-y-8">
                {/* Implementation Progress Card */}
                <div className="bg-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                      <Target size={24} className="text-indigo-200" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-100">Quality Benchmark</span>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs font-bold text-indigo-200 mb-1">Implementation Progress</p>
                          <h3 className="text-5xl font-bold text-white leading-none">{stats.checklistProgress}%</h3>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">Target 100%</div>
                        </div>
                      </div>

                      <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-[2000ms] ease-out" 
                          style={{ width: `${stats.checklistProgress}%` }}
                        ></div>
                      </div>

                      <p className="text-xs font-medium text-indigo-100 leading-relaxed opacity-80">
                        "Consistent adherence to quality standards is the cornerstone of academic excellence."
                      </p>

                      <button 
                        onClick={() => setActiveTab('checklist')}
                        className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-white/10"
                      >
                        Navigate to Checklist
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Attendance Summary */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 uppercase">Recent Attendance</h3>
                    <CalendarIcon size={18} className="text-slate-400" />
                  </div>

                  <div className="space-y-4">
                    {trainingData.attendance.slice(0, 4).map((att, i) => {
                      const teacher = teachers.find(t => t.id === att.teacher_id);
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              att.status === 'present' ? 'bg-emerald-500' : 
                              att.status === 'late' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}></div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-900 leading-none mb-1">
                                {teacher?.first_name} {teacher?.last_name}
                              </p>
                              <p className="text-[9px] font-bold text-slate-400">
                                {new Date(att.attendance_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              att.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                              att.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                            {att.status}
                          </span>
                        </div>
                      );
                    })}
                    {trainingData.attendance.length === 0 && (
                      <p className="text-center text-[10px] font-bold text-slate-400 py-4">No recent logs recorded</p>
                    )}
                  </div>

                  <button className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all group">
                    Full Report
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'students' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <StudentManager 
              schoolId={management.school_id!} 
              onClose={() => setActiveTab('dashboard')} 
            />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
            <SchoolImplementationChecklist
              currentUser={management}
              userType="management"
              targetSchoolId={management.school_id!}
            />
          </div>
        )}
      </main>

      {/* Corporate Footer */}
      <footer className="mt-auto py-8 text-center border-t border-slate-200 bg-white">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">Powered by Hauna Central Management System • 2026</p>
      </footer>
    </div>
  );
}
