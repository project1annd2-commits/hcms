import { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/services/db';
import { Collections } from '../../lib/constants';
import { 
  TrainingProgram, User, AssignmentWithDetails, 
  CertificateTemplate, Teacher, Mentor, TrainingAttendance
} from '../../lib/models';

export interface UseTrainingAssignmentDataProps {
  currentUser: User;
  filterStatus: string;
  role: 'teacher' | 'mentor';
  selectedProgramId: string;
}

export interface TrainingAssignmentState {
  assignments: AssignmentWithDetails[];
  programs: TrainingProgram[];
  teachers: (Teacher & { school?: any })[];
  mentors: (Mentor & { school?: any })[];
  schools: any[];
  templates: CertificateTemplate[];
  assigners: User[];
  schoolManagerMap: Map<string, string>;
  loading: boolean;
  error: string | null;
}

export const useTrainingAssignmentData = (
  currentUser: User, 
  filterStatus: string, 
  role: 'teacher' | 'mentor', 
  selectedProgramId: string
) => {
  const [state, setState] = useState<TrainingAssignmentState>({
    assignments: [],
    programs: [],
    teachers: [],
    mentors: [],
    schools: [],
    templates: [],
    assigners: [],
    schoolManagerMap: new Map(),
    loading: true,
    error: null
  });

  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let assignedSchoolIds: string[] = [];
      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
      }

      if (currentUser.role !== 'admin' && assignedSchoolIds.length === 0) {
        setState(prev => ({ ...prev, loading: false, assignments: [], programs: [], templates: [], teachers: [], mentors: [], schools: [] }));
        return;
      }

      let schoolFilter: any = {};
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        if (assignedSchoolIds.length <= 30) {
          schoolFilter = { id: { $in: assignedSchoolIds } };
        }
      }

      const allSchools = await db.find(Collections.SCHOOLS, schoolFilter, { sort: { name: 1 } });
      const visibleSchoolIds = allSchools.map(s => s.id);

      let teacherFilter: any = { status: 'active' };
      let mentorFilter: any = { status: 'active' };

      if (currentUser.role !== 'admin' && visibleSchoolIds.length > 0) {
        if (visibleSchoolIds.length <= 30) {
          teacherFilter.school_id = { $in: visibleSchoolIds };
          mentorFilter.school_id = { $in: visibleSchoolIds };
        }
      }

      const [programsData, teachersData, mentorsData, templatesData, assignersData, schoolAssignmentsData] = await Promise.all([
        db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {}, { sort: { title: 1 } }),
        db.find(Collections.TEACHERS, teacherFilter, { sort: { last_name: 1 } }),
        db.find(Collections.MENTORS, mentorFilter, { sort: { last_name: 1 } }),
        db.find<CertificateTemplate>(Collections.CERTIFICATE_TEMPLATES, {}),
        db.find<User>(Collections.USERS, { role: { $in: ['admin', 'employee'] } }),
        db.find(Collections.SCHOOL_ASSIGNMENTS, {})
      ]);

      const managerMap = new Map<string, string>();
      if (Array.isArray(schoolAssignmentsData)) {
        schoolAssignmentsData.forEach((sa: any) => {
          if (sa.school_id && sa.employee_id) {
            managerMap.set(sa.school_id, sa.employee_id);
          }
        });
      }

      const allUsers = [...teachersData, ...mentorsData];
      const relevantUserIds = allUsers.map(u => u.id).filter(Boolean);

      let assignmentFilter: any = {};
      if (filterStatus !== 'all') {
        assignmentFilter.status = filterStatus;
      }
      if (selectedProgramId !== 'all') {
        assignmentFilter.training_program_id = selectedProgramId;
      }

      const assignmentCollection = role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
      const userIdField = role === 'teacher' ? 'teacher_id' : 'mentor_id';

      let assignmentsData: any[] = [];
      if (currentUser.role !== 'admin' && relevantUserIds.length > 0 && relevantUserIds.length <= 30) {
        assignmentFilter[userIdField] = { $in: relevantUserIds };
        assignmentsData = await db.find(assignmentCollection, assignmentFilter, { sort: { assigned_date: -1 } });
      } else {
        assignmentsData = await db.find(assignmentCollection, assignmentFilter, { sort: { assigned_date: -1 }, limit: 500 });
      }

      let mapped = assignmentsData.map((a: any) => {
        let user;
        if (role === 'teacher') {
          user = teachersData.find((u: any) => u.id === a[userIdField]);
        } else {
          user = mentorsData.find((u: any) => u.id === a[userIdField]) || teachersData.find((u: any) => u.id === a[userIdField]);
        }

        const school = user?.school_id ? allSchools.find((s: any) => s.id === user.school_id) : undefined;
        const program = programsData.find(p => p.id === a.training_program_id);

        if (role === 'teacher') {
          return { ...a, training_program: program, teacher: user ? { ...user, school } : undefined };
        } else {
          return { ...a, training_program: program, mentor: user ? { ...user, school } : undefined };
        }
      });

      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        if (role === 'teacher') {
          mapped = mapped.filter((a: any) => a.teacher && assignedSchoolIds.includes(a.teacher.school_id));
        } else {
          mapped = mapped.filter((a: any) => a.mentor && assignedSchoolIds.includes(a.mentor.school_id));
        }
      }

      mapped = mapped.filter((a: any) => role === 'teacher' ? !!a.teacher : !!a.mentor);

      const mapSchoolToUser = (users: any[]) => users.map((u: any) => ({
        ...u,
        school: allSchools.find((s: any) => s.id === u.school_id)
      }));

      let finalAssignments = mapped;
      let finalPrograms = programsData;

      if (currentUser.username === 'rafahafarheen54') {
        const c10Programs = programsData.filter(p =>
          (p.title || '').toLowerCase().includes('c10') ||
          (p.title || '').toLowerCase().includes('c.10')
        );
        const c10ProgramIds = c10Programs.map(p => p.id);
        finalPrograms = c10Programs;
        finalAssignments = mapped.filter(a => c10ProgramIds.includes(a.training_program_id));
      }

      setState({
        assignments: finalAssignments,
        programs: finalPrograms,
        teachers: mapSchoolToUser(teachersData),
        mentors: mapSchoolToUser(mentorsData),
        schools: allSchools,
        templates: templatesData || [],
        assigners: assignersData || [],
        schoolManagerMap: managerMap,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading training assignment data:', error);
      setState(prev => ({ ...prev, loading: false, error: 'Failed to load data' }));
    }
  }, [currentUser, filterStatus, role, selectedProgramId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { ...state, loadData };
};

export const useAttendanceStats = (
  assignments: AssignmentWithDetails[],
  programs: TrainingProgram[],
  role: 'teacher' | 'mentor'
) => {
  const [attendanceStats, setAttendanceStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (assignments.length > 0 && programs.length > 0) {
      const c10Programs = programs.filter(p =>
        (p.title || '').toLowerCase().includes('c10') || (p.title || '').toLowerCase().includes('c.10')
      );

      if (c10Programs.length === 0) return;

      const c10ProgramIds = c10Programs.map(p => p.id!);
      const c10Assignments = assignments.filter(a => c10ProgramIds.includes(a.training_program_id));

      if (c10Assignments.length === 0) return;

      const fetchAttendanceStats = async () => {
        try {
          const attendanceFilter = { training_program_id: { $in: c10ProgramIds } };
          const [teacherAttendance, mentorAttendance] = await Promise.all([
            db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, attendanceFilter),
            db.find<any>(Collections.MENTOR_TRAINING_ATTENDANCE, attendanceFilter)
          ]);

          const allAttendance = [...(teacherAttendance || []), ...(mentorAttendance || [])];
          const newStats: Record<string, number> = {};

          c10Programs.forEach(program => {
            const programAttendance = allAttendance.filter(r => r.training_program_id === program.id);
            const totalSessions = 16;

            const programAssignments = c10Assignments.filter(a => a.training_program_id === program.id);
            programAssignments.forEach(assignment => {
              const userId = role === 'teacher' ? assignment.teacher_id : assignment.mentor_id;
              const userAttendance = programAttendance.filter(r =>
                (role === 'teacher' ? r.teacher_id === userId : r.mentor_id === userId) &&
                (r.status === 'present' || r.status === 'late')
              );

              const presentCount = userAttendance.length;
              const percentage = Math.round((presentCount / totalSessions) * 100);

              if (assignment.id) {
                newStats[assignment.id] = percentage;
              }
            });
          });

          setAttendanceStats(prev => ({ ...prev, ...newStats }));
        } catch (error) {
          console.error('Error fetching attendance stats:', error);
        }
      };

      fetchAttendanceStats();
    }
  }, [assignments, programs, role]);

  return attendanceStats;
};

export const useSessionStorage = () => {
  const [storedProgramId, setStoredProgramId] = useState<string | null>(null);
  const [storedRole, setStoredRole] = useState<'teacher' | 'mentor' | null>(null);

  useEffect(() => {
    const programId = sessionStorage.getItem('selectedProgramId');
    const role = sessionStorage.getItem('selectedRole');

    if (role && (role === 'teacher' || role === 'mentor')) {
      setStoredRole(role);
    }

    if (programId) {
      setStoredProgramId(programId);
    }

    sessionStorage.removeItem('selectedProgramId');
    sessionStorage.removeItem('selectedRole');
  }, []);

  return { storedProgramId, storedRole };
};