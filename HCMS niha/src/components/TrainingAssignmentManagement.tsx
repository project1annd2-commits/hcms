import { useState, useEffect, useRef } from 'react';
import { TrainingAssignment, TrainingProgram, User, AssignmentWithDetails, CertificateTemplate, Teacher, Mentor, TrainingAttendance, Permission, MentorTrainingAssignment, School } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import {
  Clock, Award, Printer, BookOpen,
  Plus, Edit2, Trash2, Target, CheckCircle2, AlertCircle, ClipboardCheck, Users, FileText, Send, Eye, Download, ArrowLeft
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import Notification from './Notification';
import RenderedTemplate from './TemplateDesigner/RenderedTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getComponentGrade } from '../lib/utils';
import { 
  getLocalDate, 
  calculateAutoProgress, 
  AssignmentFormData,
  BulkAssignFormData,
  BulkAttendanceFormData,
  getInitialFormData,
  getInitialBulkAssignForm,
  getInitialBulkAttendanceForm,
  SchoolGroup
} from './TrainingAssignment/TrainingAssignmentUtils';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

export default function TrainingAssignmentManagement({ currentUser, currentPermissions }: Props) {
  const [role, setRole] = useState<'teacher' | 'mentor'>('teacher');
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [teachers, setTeachers] = useState<(Teacher & { school?: any })[]>([]);
  const [mentors, setMentors] = useState<(Mentor & { school?: any })[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; confirmText?: string; type?: 'danger' | 'warning' | 'info' } | null>(null);
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string } | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<TrainingAssignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<TrainingAttendance[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'school' | 'training' | 'gallery'>('gallery');
  const [bulkAttendanceData, setBulkAttendanceData] = useState<{ [key: string]: boolean }>({});
  const [bulkAttendanceForm, setBulkAttendanceForm] = useState<BulkAttendanceFormData>(getInitialBulkAttendanceForm());
  const [attendanceForm, setAttendanceForm] = useState<BulkAttendanceFormData>(getInitialBulkAttendanceForm());

  const [selectedAssigner, setSelectedAssigner] = useState<string>('all');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [assigners, setAssigners] = useState<User[]>([]);
  const [schoolManagerMap, setSchoolManagerMap] = useState<Map<string, string>>(new Map());
  const [bulkAttendanceSearchTerm, setBulkAttendanceSearchTerm] = useState('');

  const [formData, setFormData] = useState<AssignmentFormData>(getInitialFormData());

  const [bulkAssignForm, setBulkAssignForm] = useState<BulkAssignFormData>(getInitialBulkAssignForm());

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateAssignment, setCertificateAssignment] = useState<AssignmentWithDetails | null>(null);
  const [certificateModalMode, setCertificateModalMode] = useState<'certificate' | 'marks_card'>('certificate');
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [includeTeachers, setIncludeTeachers] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Bulk Marks Entry State
  const [showBulkMarksModal, setShowBulkMarksModal] = useState(false);
  const [bulkMarksProgram, setBulkMarksProgram] = useState<TrainingProgram | null>(null);
  const [bulkMarksData, setBulkMarksData] = useState<{ [assignmentId: string]: Record<string, number> }>({});


  const canAssign = currentPermissions.can_assign_training || currentUser.role === 'employee';

  useEffect(() => {
    // Check for stored program and role from navigation
    const storedProgramId = sessionStorage.getItem('selectedProgramId');
    const storedRole = sessionStorage.getItem('selectedRole');

    if (storedRole && (storedRole === 'teacher' || storedRole === 'mentor')) {
      setRole(storedRole);
    }

    if (storedProgramId) {
      setSelectedProgramId(storedProgramId);
      setBulkAssignForm(prev => ({ ...prev, training_program_id: storedProgramId }));
      // Show the bulk assign modal if we have a program selected
      // setShowBulkAssignModal(true); // Don't auto-open if we want list view first
    }

    // Clear sessionStorage after reading
    sessionStorage.removeItem('selectedProgramId');
    sessionStorage.removeItem('selectedRole');
  }, []);

  // Attendance Stats State
  const [attendanceStats, setAttendanceStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (assignments.length > 0 && programs.length > 0) {
      fetchAttendanceStats();
    }
  }, [assignments, programs]);

  const fetchAttendanceStats = async () => {
    const c10Programs = programs.filter(p =>
      (p.title || '').toLowerCase().includes('c10') || (p.title || '').toLowerCase().includes('c.10')
    );

    if (c10Programs.length === 0) return;

    const c10ProgramIds = c10Programs.map(p => p.id!);
    const c10Assignments = assignments.filter(a => c10ProgramIds.includes(a.training_program_id));

    if (c10Assignments.length === 0) return;

    // Fetch attendance for these programs
    try {
      // We fetch all attendance for the relevant programs to calculate 'total sessions' correctly
      const attendanceFilter = { training_program_id: { $in: c10ProgramIds } };

      const [teacherAttendance, mentorAttendance] = await Promise.all([
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, attendanceFilter),
        db.find<any>(Collections.MENTOR_TRAINING_ATTENDANCE, attendanceFilter)
      ]);

      const allAttendance = [...(teacherAttendance || []), ...(mentorAttendance || [])];

      const newStats: Record<string, number> = {};

      c10Programs.forEach(program => {
        // Calculate total sessions for this program
        const programAttendance = allAttendance.filter(r => r.training_program_id === program.id);
        // C10 training (18 Nov to 9 Dec 2025) has fixed 16 training days (weekends excluded)
        const totalSessions = 16;

        // if (totalSessions === 0) return; // Redundant as totalSessions is 16

        // Calculate percentage for each assignment in this program
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

  useEffect(() => {
    loadData();
  }, [filterStatus, role, selectedProgramId]);

  const loadData = async () => {
    setLoading(true);

    try {
      // 1. Get Assigned Schools (for non-admins)
      let assignedSchoolIds: string[] = [];
      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
      }

      // If employee has no assigned schools, show empty state
      if (currentUser.role !== 'admin' && assignedSchoolIds.length === 0) {
        console.log('Employee has no assigned schools - showing empty state');
        setAssignments([]);
        setPrograms([]);
        setTemplates([]);
        setTeachers([]);
        setMentors([]);
        setSchools([]);
        setLoading(false);
        return;
      }

      // 2. Fetch Schools
      let schoolFilter: any = {};
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        // Optimization: Only fetch assigned schools
        // Note: Firestore 'in' query limit is 30. If more, we might need to batch or fetch all (if not too many).
        // Assuming reasonably low number of assigned schools for a manager.
        if (assignedSchoolIds.length <= 30) {
          schoolFilter = { id: { $in: assignedSchoolIds } };
        }
      }

      const allSchools = await db.find(Collections.SCHOOLS, schoolFilter, { sort: { name: 1 } });
      const visibleSchoolIds = allSchools.map(s => s.id);

      // 3. Fetch Users (Teachers/Mentors) linked to these schools
      // This avoids fetching ALL users in the system
      let teacherFilter: any = { status: 'active' };
      let mentorFilter: any = { status: 'active' };

      if (currentUser.role !== 'admin' && visibleSchoolIds.length > 0) {
        // Optimization: Filter by school_id
        // If schools are > 30, we might fallback to fetching all active users (less ideal but safer than crashing)
        // or better, relies on binding school_id
        if (visibleSchoolIds.length <= 30) {
          teacherFilter.school_id = { $in: visibleSchoolIds };
          mentorFilter.school_id = { $in: visibleSchoolIds };
        }
      }

      // Load Templates and Programs (Global, relatively small)
      // Load Users based on optimized filter
      const [programsData, teachersData, mentorsData, templatesData, assignersData, schoolAssignmentsData] = await Promise.all([
        db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {}, { sort: { title: 1 } }),
        db.find(Collections.TEACHERS, teacherFilter, { sort: { last_name: 1 } }),
        db.find(Collections.MENTORS, mentorFilter, { sort: { last_name: 1 } }),
        db.find<CertificateTemplate>(Collections.CERTIFICATE_TEMPLATES, {}),
        db.find<User>(Collections.USERS, { role: { $in: ['admin', 'employee'] } }),
        db.find(Collections.SCHOOL_ASSIGNMENTS, {})
      ]);
      setAssigners(assignersData || []);

      // Create school manager map
      const managerMap = new Map<string, string>();
      if (Array.isArray(schoolAssignmentsData)) {
        schoolAssignmentsData.forEach((sa: any) => {
          if (sa.school_id && sa.employee_id) {
            managerMap.set(sa.school_id, sa.employee_id);
          }
        });
      }
      setSchoolManagerMap(managerMap);


      const allUsers = [...teachersData, ...mentorsData];
      const relevantUserIds = allUsers.map(u => u.id).filter(Boolean);

      // 4. Fetch Assignments filtered by relevant User IDs
      // This is the CRITICAL optimization to avoid fetching 1000s of assignments

      let assignmentFilter: any = {};
      if (filterStatus !== 'all') {
        assignmentFilter.status = filterStatus;
      }

      if (selectedProgramId !== 'all') {
        assignmentFilter.training_program_id = selectedProgramId;
      }

      const assignmentCollection = role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
      const userIdField = role === 'teacher' ? 'teacher_id' : 'mentor_id';

      // Only apply ID filter if we have a reasonable number of users, otherwise we might still hit limits
      // or if we are admin, we want to see all? Maybe not.
      // For now, let's try to filter if we aren't admin.
      // Firestore 'in' limit is 30. We can't use 'in' for 100 users.
      // BUT, we can client-side filter if we have to, OR we rely on the quota reset.
      // Improved Strategy: Fetch assignments for the Visible Schools if possible? No, assignments don't have school_id.
      // We must fetch assignments. 
      // ERROR: We can't effectively filter assignments by 100 user IDs without batching.
      // However, fetching ALL assignments is what causes the quota issue.

      // COMPROMISE: If we are a Manager (not Admin), we likely manage a subset.
      // If we have < 30 users, use 'in'.
      // If we have more, we might have to fetch all_active or paginate?
      // Let's assume for Rahila (7 mentors), she fits in the limit.

      let assignmentsData: any[] = [];
      if (currentUser.role !== 'admin' && relevantUserIds.length > 0 && relevantUserIds.length <= 30) {
        assignmentFilter[userIdField] = { $in: relevantUserIds };
        assignmentsData = await db.find(assignmentCollection, assignmentFilter, { sort: { assigned_date: -1 } });
      } else {
        // Fallback to fetch all if too many users (or admin) - but arguably admins hit quota too.
        // Ideally we should limit by date or something.
        // For now, let's LIMIT the fetch to 500 to save quota?
        assignmentsData = await db.find(assignmentCollection, assignmentFilter, { sort: { assigned_date: -1 }, limit: 500 });
      }

      // Map assignments with joined data
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
          return {
            ...a,
            training_program: program,
            teacher: user ? { ...user, school } : undefined
          };
        } else {
          return {
            ...a,
            training_program: program,
            mentor: user ? { ...user, school } : undefined
          };
        }
      });

      // Filter by assigned schools logic (Client side double check)
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        if (role === 'teacher') {
          mapped = mapped.filter((a: any) => a.teacher && assignedSchoolIds.includes(a.teacher.school_id));
        } else {
          mapped = mapped.filter((a: any) => a.mentor && assignedSchoolIds.includes(a.mentor.school_id));
        }
      }

      // Filter out assignments where user wasn't found (orphaned)
      mapped = mapped.filter((a: any) => role === 'teacher' ? !!a.teacher : !!a.mentor);

      console.log('Final assignments to display:', mapped.length);

      setSchools(allSchools);
      setTemplates(templatesData);

      const mapSchoolToUser = (users: any[]) => users.map((u: any) => ({
        ...u,
        school: allSchools.find((s: any) => s.id === u.school_id)
      }));

      setTeachers(mapSchoolToUser(teachersData));
      setMentors(mapSchoolToUser(mentorsData));

      // SPECIAL RULE: Restrict 'rafahafarheen54' to only C10 programs
      if (currentUser.username === 'rafahafarheen54') {
        const c10Programs = programsData.filter(p =>
          (p.title || '').toLowerCase().includes('c10') ||
          (p.title || '').toLowerCase().includes('c.10')
        );
        const c10ProgramIds = c10Programs.map(p => p.id);

        setPrograms(c10Programs);
        setAssignments(mapped.filter(a => c10ProgramIds.includes(a.training_program_id)));
      } else {
        setAssignments(mapped);
        setPrograms(programsData);
      }


    } catch (error) {
      console.error('Error loading training assignment data:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error Loading Data',
        message: 'Failed to load assignments. Please try again later.'
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedUserId = role === 'teacher' ? formData.teacher_id : formData.mentor_id;
    // Determine if the selected user is a teacher or mentor based on who they are, not current view role
    const isTeacher = teachers.some(t => t.id === selectedUserId);

    const collection = isTeacher ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
    const userIdField = isTeacher ? 'teacher_id' : 'mentor_id';
    const userId = selectedUserId;

    let finalScore = formData.score ? parseInt(formData.score) : null;
    const program = programs.find(p => p.id === formData.training_program_id);

    if (program?.enable_marks_card && program.marks_configuration?.subjects?.length) {
      let totalObtained = 0;
      let totalMax = 0;
      program.marks_configuration.subjects.forEach(sub => {
        totalObtained += (formData.marks_data[sub.name] || 0);
        totalMax += sub.max_marks;
      });
      if (totalMax > 0) {
        finalScore = Math.round((totalObtained / totalMax) * 100);
      }
    }

    const data = {
      training_program_id: formData.training_program_id,
      [userIdField]: userId,
      due_date: formData.due_date || null,
      status: formData.status,
      progress_percentage: formData.progress_percentage,
      completion_date: formData.completion_date || null,
      score: finalScore,
      marks_data: formData.marks_data,
    };

    if (editingAssignment && editingAssignment.id) {
      // C10 Auto-Publish Logic
      const selectedProgram = programs.find(p => p.id === formData.training_program_id);
      const isC10 = selectedProgram && (
        (selectedProgram.title || '').toLowerCase().includes('c10') ||
        (selectedProgram.title || '').toLowerCase().includes('c.10')
      );

      const updateData: any = {
        ...data, // Use the 'data' object which includes calculated score and marks_data
        updated_at: new Date().toISOString(),
      };

      // If it's C10 and has marks, auto-publish and complete
      if (isC10 && formData.marks_data && Object.keys(formData.marks_data).length > 0) {
        updateData.marks_published = true;
        updateData.marks_published_date = new Date().toISOString();
        updateData.marks_published_by = currentUser.id;
        updateData.status = 'completed';
        updateData.progress_percentage = 100;
        updateData.completion_date = new Date().toISOString(); // Also set completion date
      }

      await db.updateById(collection, editingAssignment.id, updateData);
    } else {
      await db.insertOne(collection, {
        ...data,
        assigned_by: currentUser.id,
        assigned_date: getLocalDate(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    loadData();
    resetForm();
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkAssignForm.training_program_id) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Training Program Required',
        message: 'Please select a training program to continue'
      });
      return;
    }

    let assignedSchoolIds: string[] = [];

    if (currentUser.role !== 'admin' && currentUser.id) {
      const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
      assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
    }

    const usersToAssignList: any[] = role === 'teacher'
      ? teachers
      : (includeTeachers ? [...mentors, ...teachers] : mentors);
    let usersToAssign = usersToAssignList;

    if (bulkAssignForm.school_id !== 'all') {
      usersToAssign = usersToAssignList.filter((u: any) => u.school_id === bulkAssignForm.school_id);
    }

    if (currentUser.role !== 'admin') {
      usersToAssign = usersToAssign.filter((u: any) => u.school_id && assignedSchoolIds.includes(u.school_id));
    }

    if (usersToAssign.length === 0) {
      setNotification({
        isOpen: true,
        type: 'info',
        title: `No ${role === 'teacher' ? 'Teachers' : 'Mentors'} Found`,
        message: `No ${role === 'teacher' ? 'teachers' : 'mentors'} available to assign to this training program`
      });
      return;
    }

    const teacherUsers = usersToAssign.filter((u: any) => teachers.some(t => t.id === u.id));
    const mentorUsers = usersToAssign.filter((u: any) => mentors.some(m => m.id === u.id) && !teachers.some(t => t.id === u.id));

    let createdCount = 0;

    const processAssignments = async () => {
      // Process Teachers
      if (teacherUsers.length > 0) {
        const existingTeacherAssignments = await db.find(Collections.TRAINING_ASSIGNMENTS, {
          training_program_id: bulkAssignForm.training_program_id
        });
        const existingTeacherIds = new Set(existingTeacherAssignments?.map((a: any) => a.teacher_id) || []);

        const teacherAssignmentsToCreate = teacherUsers
          .filter((u: any) => !existingTeacherIds.has(u.id))
          .map((user: any) => ({
            training_program_id: bulkAssignForm.training_program_id,
            teacher_id: user.id,
            due_date: bulkAssignForm.due_date || null,
            status: 'assigned' as const,
            progress_percentage: 0,
            assigned_date: getLocalDate(),
            assigned_by: currentUser.id,
          }));

        if (teacherAssignmentsToCreate.length > 0) {
          await db.insertMany(Collections.TRAINING_ASSIGNMENTS, teacherAssignmentsToCreate as any);
          createdCount += teacherAssignmentsToCreate.length;
        }
      }

      // Process Mentors
      if (mentorUsers.length > 0) {
        const existingMentorAssignments = await db.find(Collections.MENTOR_TRAINING_ASSIGNMENTS, {
          training_program_id: bulkAssignForm.training_program_id
        });
        const existingMentorIds = new Set(existingMentorAssignments?.map((a: any) => a.mentor_id) || []);

        const mentorAssignmentsToCreate = mentorUsers
          .filter((u: any) => !existingMentorIds.has(u.id))
          .map((user: any) => ({
            training_program_id: bulkAssignForm.training_program_id,
            mentor_id: user.id,
            due_date: bulkAssignForm.due_date || null,
            status: 'assigned' as const,
            progress_percentage: 0,
            assigned_date: getLocalDate(),
            assigned_by: currentUser.id,
          }));

        if (mentorAssignmentsToCreate.length > 0) {
          await db.insertMany(Collections.MENTOR_TRAINING_ASSIGNMENTS, mentorAssignmentsToCreate as any);
          createdCount += mentorAssignmentsToCreate.length;
        }
      }
    };

    await processAssignments();

    if (createdCount === 0) {
      setNotification({
        isOpen: true,
        type: 'info',
        title: 'Already Assigned',
        message: `All selected users are already assigned to this training program`
      });
      return;
    }

    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Assignments Created',
      message: `Successfully assigned ${createdCount} users to the training program`
    });
    setShowBulkAssignModal(false);
    setBulkAssignForm({
      training_program_id: '',
      due_date: '',
      school_id: 'all',
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this training assignment? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        const collection = role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
        await db.deleteById(collection, id);
        setConfirmDialog(null);
        loadData();
      }
    });
  };

  const handleGenerateCertificate = async (assignment: AssignmentWithDetails) => {
    if (assignment.status !== 'completed') {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Cannot Generate Certificate',
        message: 'Certificate can only be generated for completed training assignments.'
      });
      return;
    }

    if (!assignment.certificate_issued) {
      // Mark as issued if not already
      const collection = role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
      try {
        await db.updateById(collection, assignment.id!, {
          ...assignment,
          certificate_issued: true,
          certificate_issue_date: new Date().toISOString()
        });
        // Update local state to reflect change immediately
        const updatedAssignment = {
          ...assignment,
          certificate_issued: true,
          certificate_issue_date: new Date().toISOString()
        };
        setCertificateAssignment(updatedAssignment);
        loadData(); // Activity refresh
      } catch (error) {
        console.error("Error updating certificate status", error);
      }
    } else {
      setCertificateAssignment(assignment);
    }
    setCertificateModalMode('certificate');
    setShowCertificateModal(true);
  };

  const resetForm = () => {
    setFormData({
      training_program_id: '',
      teacher_id: '',
      mentor_id: '',
      due_date: '',
      status: 'assigned',
      progress_percentage: 0,
      completion_date: '',
      score: '',
      marks_data: {},
    });
    setEditingAssignment(null);
    setShowModal(false);
    setIncludeTeachers(false);
  };

  const openEditModal = (assignment: AssignmentWithDetails) => {
    setEditingAssignment(assignment as any);
    setFormData({
      training_program_id: assignment.training_program_id,
      teacher_id: assignment.teacher_id || '',
      mentor_id: assignment.mentor_id || '',
      due_date: assignment.due_date || '',
      status: assignment.status,
      progress_percentage: assignment.progress_percentage,
      completion_date: assignment.completion_date || '',
      score: assignment.score?.toString() || '',
      marks_data: assignment.marks_data || {},
    });
    setShowModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-600" size={20} />;
      case 'in_progress': return <Clock className="text-blue-600" size={20} />;
      case 'overdue': return <AlertCircle className="text-red-600" size={20} />;
      default: return <Target className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openAttendanceModal = async (assignment: AssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    const collection = role === 'teacher' ? Collections.TRAINING_ATTENDANCE : Collections.MENTOR_TRAINING_ATTENDANCE;
    const data = await db.find<TrainingAttendance>(
      collection,
      { assignment_id: assignment.id }
    );

    // Sort attendance records chronologically (client-side)
    const sortedData = data.sort((a, b) => {
      return a.attendance_date.localeCompare(b.attendance_date);
    });

    setAttendanceRecords(sortedData);
    setShowAttendanceModal(true);
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    const collection = role === 'teacher' ? Collections.TRAINING_ATTENDANCE : Collections.MENTOR_TRAINING_ATTENDANCE;
    const userIdField = role === 'teacher' ? 'teacher_id' : 'mentor_id';
    const userId = role === 'teacher' ? selectedAssignment.teacher_id : selectedAssignment.mentor_id;

    try {
      await db.upsert(
        collection,
        {
          [userIdField]: userId,
          training_program_id: selectedAssignment.training_program_id,
          attendance_date: attendanceForm.attendance_date
        },
        {
          assignment_id: selectedAssignment.id,
          [userIdField]: userId,
          training_program_id: selectedAssignment.training_program_id,
          attendance_date: attendanceForm.attendance_date,
          status: attendanceForm.status,
          notes: attendanceForm.notes,
          recorded_by: currentUser.id,
          updated_at: new Date().toISOString(),
        } as any
      );
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message
      });
      return;
    }

    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Attendance Recorded',
      message: 'Attendance has been successfully recorded'
    });

    openAttendanceModal(selectedAssignment);
    setAttendanceForm({
      attendance_date: getLocalDate(),
      status: 'present',
      notes: '',
    });
  };

  const handleDeleteAttendance = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Attendance Record',
      message: 'Are you sure you want to delete this attendance record? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        const collection = role === 'teacher' ? Collections.TRAINING_ATTENDANCE : Collections.MENTOR_TRAINING_ATTENDANCE;
        await db.deleteById(collection, id);
        setConfirmDialog(null);
        if (selectedAssignment) openAttendanceModal(selectedAssignment);
      }
    });
  };

  const openBulkAttendanceModal = async (program: TrainingProgram) => {
    setSelectedProgram(program);
    setBulkAttendanceData({});
    setBulkAttendanceForm({
      attendance_date: getLocalDate(),
      status: 'present',
      notes: '',
    });
    setShowBulkAttendanceModal(true);
  };

  const openBulkAbsenteeModal = async (program: TrainingProgram) => {
    setSelectedProgram(program);
    setBulkAttendanceData({});
    setBulkAttendanceForm({
      attendance_date: getLocalDate(),
      status: 'absent',
      notes: '',
    });
    setShowBulkAttendanceModal(true);
  };

  const toggleTeacherSelection = (assignmentId: string) => {
    setBulkAttendanceData(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  const toggleAllTeachers = () => {
    const programAssignments = assignments.filter(
      a => a.training_program_id === selectedProgram?.id
    );
    const allSelected = programAssignments.every(a => a.id && bulkAttendanceData[a.id!]);

    const newData: { [key: string]: boolean } = {};
    programAssignments.forEach(a => {
      if (a.id) newData[a.id] = !allSelected;
    });
    setBulkAttendanceData(newData);
  };

  const handleBulkAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedAssignmentIds = Object.keys(bulkAttendanceData).filter(
      id => bulkAttendanceData[id]
    );
    if (selectedAssignmentIds.length === 0) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: `No ${role === 'teacher' ? 'Teachers' : 'Mentors'} Selected`,
        message: `Please select at least one ${role === 'teacher' ? 'teacher' : 'mentor'} to record attendance`
      });
      return;
    }

    const collection = role === 'teacher' ? Collections.TRAINING_ATTENDANCE : Collections.MENTOR_TRAINING_ATTENDANCE;
    const userIdField = role === 'teacher' ? 'teacher_id' : 'mentor_id';

    const attendanceRecords = selectedAssignmentIds.map(assignmentId => {
      const assignment = assignments.find(a => a.id === assignmentId);
      const userId = role === 'teacher' ? assignment?.teacher_id : assignment?.mentor_id;

      return {
        assignment_id: assignmentId,
        [userIdField]: userId,
        training_program_id: assignment?.training_program_id,
        attendance_date: bulkAttendanceForm.attendance_date,
        status: bulkAttendanceForm.status,
        notes: bulkAttendanceForm.notes,
        recorded_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    try {
      // Use insertMany for bulk insert (MongoDB will handle duplicates based on unique indexes)
      await db.insertMany(collection, attendanceRecords as any);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message
      });
      return;
    }

    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Attendance Recorded',
      message: `Attendance recorded for ${selectedAssignmentIds.length} ${role === 'teacher' ? 'teacher(s)' : 'mentor(s)'}`
    });
    setShowBulkAttendanceModal(false);
    setBulkAttendanceData({});
  };

  const groupAssignmentsBySchool = (): SchoolGroup[] => {
    const filtered = selectedSchoolFilter
      ? assignments.filter(a => (role === 'teacher' ? a.teacher : a.mentor)?.school_id === selectedSchoolFilter)
      : assignments;

    const grouped = new Map<string, SchoolGroup>();

    filtered.forEach(assignment => {
      const user = role === 'teacher' ? assignment.teacher : assignment.mentor;

      const schoolId = user?.school_id || 'unassigned';
      const schoolName = user?.school?.name || 'Unassigned';

      if (!grouped.has(schoolId)) {
        grouped.set(schoolId, {
          school_id: schoolId,
          school_name: schoolName,
          assignments: []
        });
      }

      grouped.get(schoolId)!.assignments.push(assignment);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      // Put "Unassigned" at the end
      if (a.school_id === 'unassigned') return 1;
      if (b.school_id === 'unassigned') return -1;
      return a.school_name.localeCompare(b.school_name);
    });
  };

  type TrainingGroup = {
    group_id: string;
    group_name: string;
    assignments: AssignmentWithDetails[];
  };

  const groupAssignmentsByTraining = (): TrainingGroup[] => {
    const filtered = selectedSchoolFilter
      ? assignments.filter(a => (role === 'teacher' ? a.teacher : a.mentor)?.school_id === selectedSchoolFilter)
      : assignments;

    const c10Assignments = filtered.filter(a => {
      const title = (a.training_program?.title || '').toLowerCase();
      return title.includes('c10') || title.includes('c.10');
    });

    const b4Assignments = filtered.filter(a => {
      const title = (a.training_program?.title || '').toLowerCase();
      return title.includes('b4');
    });

    const refresherAssignments = filtered.filter(a => {
      const title = (a.training_program?.title || '').toLowerCase();
      return title.includes('refresher');
    });

    const otherAssignments = filtered.filter(a => {
      const title = (a.training_program?.title || '').toLowerCase();
      return !(title.includes('c10') || title.includes('c.10') || title.includes('b4') || title.includes('refresher'));
    });

    const groups: TrainingGroup[] = [];

    if (c10Assignments.length > 0) {
      groups.push({
        group_id: 'c10',
        group_name: 'C10 Teacher Training',
        assignments: c10Assignments
      });
    }

    if (b4Assignments.length > 0) {
      groups.push({
        group_id: 'b4',
        group_name: 'B4 Mentors Training',
        assignments: b4Assignments
      });
    }

    if (refresherAssignments.length > 0) {
      groups.push({
        group_id: 'refresher',
        group_name: 'Refresher Training',
        assignments: refresherAssignments
      });
    }

    if (otherAssignments.length > 0) {
      groups.push({
        group_id: 'other',
        group_name: 'Other Training',
        assignments: otherAssignments
      });
    }

    return groups;
  };

  // Open Bulk Marks Entry Modal
  const openBulkMarksModal = (program: TrainingProgram) => {
    setBulkMarksProgram(program);
    // Initialize marks data from existing assignments
    const programAssignments = assignments.filter(a => a.training_program_id === program.id);
    const initialData: { [assignmentId: string]: Record<string, number> } = {};
    programAssignments.forEach(a => {
      if (a.id) {
        initialData[a.id] = a.marks_data || {};
      }
    });
    setBulkMarksData(initialData);
    setShowBulkMarksModal(true);
  };

  // Handle Bulk Marks Save
  const handleBulkMarksSave = async () => {
    if (!bulkMarksProgram) return;

    const collection = role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
    const program = bulkMarksProgram;

    try {
      for (const [assignmentId, marksData] of Object.entries(bulkMarksData)) {
        // Calculate total score
        let totalObtained = 0;
        let totalMax = 0;
        if (program.marks_configuration?.subjects?.length) {
          program.marks_configuration.subjects.forEach(sub => {
            totalObtained += (marksData[sub.name] || 0);
            totalMax += sub.max_marks;
          });
        }
        const score = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

        const isC10 = (program.title || '').toLowerCase().includes('c10') ||
          (program.title || '').toLowerCase().includes('c.10');

        const updateData: any = {
          marks_data: marksData,
          score: score,
          updated_at: new Date().toISOString(),
        };

        // Auto-publish and complete for C10
        if (isC10 && Object.keys(marksData).length > 0) {
          updateData.marks_published = true;
          updateData.marks_published_date = new Date().toISOString();
          updateData.marks_published_by = currentUser.id;
          updateData.status = 'completed';
          updateData.progress_percentage = 100;
        }

        await db.updateById(collection, assignmentId, updateData);
      }

      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Marks Saved',
        message: `Marks saved for ${Object.keys(bulkMarksData).length} assignments`
      });
      setShowBulkMarksModal(false);
      setBulkMarksData({});
      loadData();
    } catch (error) {
      console.error('Error saving marks:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save marks. Please try again.'
      });
    }
  };

  // Handle Publish Marks Card
  const handlePublishMarks = async (assignment: AssignmentWithDetails) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Publish Marks Card',
      confirmText: 'Publish',
      type: 'info',
      message: `Are you sure you want to publish the marks card for ${role === 'teacher'
        ? `${assignment.teacher?.first_name} ${assignment.teacher?.last_name}`
        : `${assignment.mentor?.first_name} ${assignment.mentor?.last_name}`}? The teacher will be able to view their marks in their portal.`,
      onConfirm: async () => {
        const collection = role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
        try {
          await db.updateById(collection, assignment.id!, {
            marks_published: true,
            marks_published_date: new Date().toISOString(),
            marks_published_by: currentUser.id,
          });
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Marks Published',
            message: 'The marks card has been published and is now visible to the teacher.'
          });
          setConfirmDialog(null);
          loadData();
        } catch (error) {
          console.error('Error publishing marks:', error);
          setNotification({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'Failed to publish marks. Please try again.'
          });
        }
      }
    });
  };

  // Handle Bulk Publish Marks
  const handleBulkPublishMarks = async () => {
    if (!bulkMarksProgram) return;

    const collection = role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS;
    const programAssignments = assignments.filter(a =>
      a.training_program_id === bulkMarksProgram.id &&
      a.marks_data &&
      Object.keys(a.marks_data).length > 0 &&
      !a.marks_published
    );

    if (programAssignments.length === 0) {
      setNotification({
        isOpen: true,
        type: 'info',
        title: 'No Marks to Publish',
        message: 'No unpublished marks cards found for this program. Please enter marks first.'
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Publish All Marks Cards',
      confirmText: 'Publish',
      type: 'info',
      message: `Are you sure you want to publish marks cards for ${programAssignments.length} ${role === 'teacher' ? 'teachers' : 'mentors'}? They will be able to view their marks in their portal.`,
      onConfirm: async () => {
        try {
          for (const assignment of programAssignments) {
            await db.updateById(collection, assignment.id!, {
              marks_published: true,
              marks_published_date: new Date().toISOString(),
              marks_published_by: currentUser.id,
            });
          }
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Marks Published',
            message: `Published marks cards for ${programAssignments.length} ${role === 'teacher' ? 'teachers' : 'mentors'}.`
          });
          setConfirmDialog(null);
          setShowBulkMarksModal(false);
          loadData();
        } catch (error) {
          console.error('Error publishing marks:', error);
          setNotification({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'Failed to publish marks. Please try again.'
          });
        }
      }
    });
  };

  // View Marks Card
  const handleViewMarksCard = (assignment: AssignmentWithDetails) => {
    setCertificateAssignment(assignment);
    setCertificateModalMode('marks_card');
    setShowCertificateModal(true);
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const element = certificateRef.current;
      const isPortrait = certificateModalMode === 'marks_card';

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Force dimensions to match A4 aspect ratio for capture
        width: isPortrait ? element.offsetWidth : element.offsetWidth,
        height: isPortrait ? (element.offsetWidth * 1.414) : (element.offsetWidth / 1.414),
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: isPortrait ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      if (isPortrait) {
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      }

      const fileName = certificateModalMode === 'certificate'
        ? `Certificate_${certificateAssignment?.teacher?.first_name || certificateAssignment?.mentor?.first_name || 'Trainee'}.pdf`
        : `MarksCard_${certificateAssignment?.teacher?.first_name || certificateAssignment?.mentor?.first_name || 'Trainee'}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Download Error',
        message: 'Failed to generate PDF. Please try again or use the Print option.'
      });
    }
  };

  const handleDownloadRefresherReport = async () => {
    try {
      setLoading(true);

      // 1. Fetch ALL Refresher programs
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
      const refresherPrograms = allPrograms.filter(p =>
        (p.title || '').toLowerCase().includes('refresher')
      );

      if (refresherPrograms.length === 0) {
        setNotification({
          isOpen: true,
          type: 'info',
          title: 'No Programs Found',
          message: 'No training programs with "Refresher" in the title were found.'
        });
        setLoading(false);
        return;
      }

      const refresherProgramIds = refresherPrograms.map(p => p.id!);

      // 2. Fetch Assignments for these programs
      const [teacherAssignments, mentorAssignments] = await Promise.all([
        db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, {
          training_program_id: { $in: refresherProgramIds }
        }),
        db.find<MentorTrainingAssignment>(Collections.MENTOR_TRAINING_ASSIGNMENTS, {
          training_program_id: { $in: refresherProgramIds }
        })
      ]);

      // 3. Filter by Date Range (Dec 30 to Feb 10)
      const startDate = '2025-12-30';
      const endDate = '2026-02-10';

      const filterByDate = (a: any) => {
        const date = a.assigned_date || a.created_at?.split('T')[0];
        return date >= startDate && date <= endDate;
      };

      const filteredTeacherAssignments = (teacherAssignments || []).filter(filterByDate);
      const filteredMentorAssignments = (mentorAssignments || []).filter(filterByDate);

      if (filteredTeacherAssignments.length === 0 && filteredMentorAssignments.length === 0) {
        setNotification({
          isOpen: true,
          type: 'info',
          title: 'No Data Found',
          message: 'No assignments found for Refresher Training between Dec 30 and Feb 10.'
        });
        setLoading(false);
        return;
      }

      // 4. Load related data for export
      const [allTeachers, allMentors, allSchools] = await Promise.all([
        db.find<Teacher>(Collections.TEACHERS, {}),
        db.find<Mentor>(Collections.MENTORS, {}),
        db.find<School>(Collections.SCHOOLS, {})
      ]);

      // 5. Build CSV Rows
      let csvContent = "Trainee Name,Role,School,Program,Assigned Date,Status,Score\n";

      const addRows = (assignments: any[], trainees: any[], roleLabel: string) => {
        assignments.forEach(a => {
          const trainee = trainees.find(t => t.id === (roleLabel === 'Teacher' ? a.teacher_id : a.mentor_id));
          const school = allSchools.find(s => s.id === trainee?.school_id);
          const program = refresherPrograms.find(p => p.id === a.training_program_id);

          if (trainee) {
            const name = `"${trainee.first_name || ''} ${trainee.last_name || ''}"`.trim();
            const schoolName = `"${school?.name || 'N/A'}"`;
            const programTitle = `"${program?.title || 'Refresher Training'}"`;
            const date = a.assigned_date || 'N/A';
            const status = a.status || 'N/A';
            const score = a.score !== null && a.score !== undefined ? a.score : '-';

            csvContent += `${name},${roleLabel},${schoolName},${programTitle},${date},${status},${score}\n`;
          }
        });
      };

      addRows(filteredTeacherAssignments, allTeachers, 'Teacher');
      addRows(filteredMentorAssignments, allMentors, 'Mentor');

      // 6. Download File
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Refresher_Training_Assignments_${getLocalDate()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Report Downloaded',
        message: 'The Refresher Training report has been successfully generated.'
      });

    } catch (error) {
      console.error('Error downloading report:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Download Failed',
        message: 'Could not generate the report. Please check your connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const schoolGroups = groupAssignmentsBySchool();
  let filteredAssignments = assignments;

  if (selectedSchoolFilter) {
    filteredAssignments = filteredAssignments.filter(a => (role === 'teacher' ? a.teacher : a.mentor)?.school_id === selectedSchoolFilter);
  }

  if (selectedAssigner !== 'all') {
    filteredAssignments = filteredAssignments.filter(a => {
      // 1. Check if the selected user is the one who directly created/assigned it
      if (a.assigned_by === selectedAssigner) return true;

      // 2. Check if the selected user is the School Manager of the trainee
      const trainee = role === 'teacher' ? a.teacher : a.mentor;
      if (trainee?.school_id) {
        const managerId = schoolManagerMap.get(trainee.school_id);
        if (managerId === selectedAssigner) return true;
      }

      return false;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectedProgramId === 'all'
              ? `${role === 'teacher' ? 'Teacher' : 'Mentor'} Training Programs`
              : `${role === 'teacher' ? 'Teacher' : 'Mentor'} Assignments`
            }
          </h2>
          {selectedProgramId !== 'all' && (
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => {
                  setSelectedProgramId('all');
                  setViewMode('gallery');
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Back to Programs
              </button>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600 font-semibold">
                {programs.find(p => p.id === selectedProgramId)?.title}
              </span>
            </div>
          )}
          {selectedProgramId === 'all' && (
            <p className="text-gray-600 mt-1">Select a training program to manage {role} assignments</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Role Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${role === 'teacher'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-blue-600'
                }`}
            >
              <Users size={18} />
              Teachers
            </button>
            <button
              type="button"
              onClick={() => setRole('mentor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${role === 'mentor'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
                }`}
            >
              <Award size={18} />
              Mentors
            </button>
          </div>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'list' | 'school' | 'training' | 'gallery')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="gallery">Gallery (Programs)</option>
            <option value="school">Group by School</option>
            <option value="training">Group by Training</option>
            <option value="list">List View</option>
          </select>
          <select
            value={selectedSchoolFilter}
            onChange={(e) => setSelectedSchoolFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="all">All Programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
          <select
            value={selectedAssigner}
            onChange={(e) => setSelectedAssigner(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Assigned By: All</option>
            <option value="self">Self-Enrolled</option>
            {assigners.map((assigner) => (
              <option key={assigner.id} value={assigner.id}>
                {assigner.full_name}
              </option>
            ))}
          </select>

          {selectedProgramId !== 'all' && (
            <button
              onClick={() => {
                setSelectedProgramId('all');
                setViewMode('gallery');
              }}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
            >
              Back to Programs
            </button>
          )}

          <button
            onClick={() => {
              if (programs.length === 0) {
                setNotification({
                  isOpen: true,
                  type: 'info',
                  title: 'No Training Programs',
                  message: 'Please create a training program first before recording attendance'
                });
                return;
              }
              openBulkAttendanceModal(programs[0]);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Users size={20} />
            Bulk Attendance
          </button>
          <button
            onClick={() => {
              if (programs.length === 0) {
                setNotification({
                  isOpen: true,
                  type: 'info',
                  title: 'No Training Programs',
                  message: 'Please create a training program first before recording attendance'
                });
                return;
              }
              openBulkAbsenteeModal(programs[0]);
            }}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Users size={20} />
            Mark Bulk Absentees
          </button>
          {canAssign && (
            <button
              onClick={() => {
                const marksPrograms = programs.filter(p => p.enable_marks_card && p.marks_configuration?.subjects?.length);
                if (marksPrograms.length === 0) {
                  setNotification({
                    isOpen: true,
                    type: 'info',
                    title: 'No Programs with Marks Card',
                    message: 'No training programs with marks card enabled. Please enable marks card in a training program first.'
                  });
                  return;
                }
                openBulkMarksModal(marksPrograms[0]);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FileText size={20} />
              Bulk Marks Entry
            </button>
          )}
          {canAssign && (
            <>
              <button
                onClick={() => setShowBulkAssignModal(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Users size={20} />
                Bulk Assign
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Create Assignment
              </button>
            </>
          )}
          <button
            onClick={handleDownloadRefresherReport}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download size={20} />
            Export Refresher Report
          </button>
        </div>
      </div>

      {viewMode === 'gallery' && selectedProgramId === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => {
            const programAssignments = assignments.filter(a => a.training_program_id === program.id);
            const total = programAssignments.length;
            const completed = programAssignments.filter(a => a.status === 'completed').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isC10 = (program.title || '').toLowerCase().includes('c10') || (program.title || '').toLowerCase().includes('c.10');

            return (
              <div
                key={program.id}
                onClick={() => {
                  setSelectedProgramId(program.id!);
                  setViewMode('list');
                }}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col h-full"
              >
                <div className={`h-2 w-full ${isC10 ? 'bg-blue-500' : (program.title || '').toLowerCase().includes('b4') ? 'bg-purple-500' : 'bg-green-500'}`} />
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg ${isC10 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      <BookOpen className={isC10 ? 'text-blue-600' : 'text-gray-600'} size={24} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${program.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                      {program.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3.5rem]">
                    {program.title}
                  </h3>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Trainees</span>
                      <span className="font-semibold text-gray-900">{total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Completed</span>
                      <span className="font-semibold text-green-600">{completed}</span>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Overall Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${isC10 ? 'bg-blue-500' : 'bg-green-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">View List</span>
                  <div className="p-1 px-2 bg-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <Users size={16} className="text-blue-600" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{role === 'teacher' ? 'Teacher' : 'Assignee'}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {role === 'teacher'
                        ? (assignment.teacher ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}` : 'N/A')
                        : (assignment.mentor ? `${assignment.mentor.first_name} ${assignment.mentor.last_name}` : 'N/A')
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {role === 'teacher'
                        ? (assignment.teacher?.school?.name || 'N/A')
                        : (assignment.mentor?.school?.name || 'N/A')
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{assignment.training_program?.title || 'N/A'}</div>
                    <div className="text-xs text-gray-500">
                      {assignment.training_program?.duration_hours || 0} hours
                      {assignment.training_program?.start_date && assignment.training_program?.end_date && (
                        <span className="ml-2">
                          • {new Date(assignment.training_program.start_date).toLocaleDateString()} - {new Date(assignment.training_program.end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${calculateAutoProgress(assignment) === 100 ? 'bg-green-600' :
                              calculateAutoProgress(assignment) >= 50 ? 'bg-blue-600' :
                                'bg-yellow-600'
                              }`}
                            style={{ width: `${calculateAutoProgress(assignment)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{calculateAutoProgress(assignment)}%</span>
                      </div>
                      {assignment.training_program?.start_date && assignment.training_program?.end_date && assignment.status !== 'completed' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium" title="Progress calculated based on training duration">
                          Auto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(assignment.status)}
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                      {assignment.is_self_enrolled && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 uppercase tracking-tighter">
                          <Award size={10} />
                          Self-Enrolled
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAttendanceModal(assignment)}
                        className="text-green-600 hover:text-green-900"
                        title="Manage Attendance"
                      >
                        <ClipboardCheck size={18} />
                      </button>
                      {canAssign && (
                        <>
                          <button
                            onClick={() => openEditModal(assignment)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => assignment.id && handleDelete(assignment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                      {/* Generate/View Certificate */}
                      {(() => {
                        if (assignment.status !== 'completed') return null;
                        const isC10 = (assignment.training_program?.title || '').toLowerCase().includes('c10') ||
                          (assignment.training_program?.title || '').toLowerCase().includes('c.10');
                        const attendance = attendanceStats[assignment.id!] ?? 0;
                        if (isC10 && attendance < 75) return null;

                        return (
                          <button
                            onClick={() => handleGenerateCertificate(assignment)}
                            className="text-purple-600 hover:text-purple-900"
                            title={assignment.certificate_issued ? "View Certificate" : "Generate Certificate"}
                          >
                            <Award size={18} />
                          </button>
                        );
                      })()}

                      {/* View/Publish Marks Card buttons */}
                      {(() => {
                        if (!(assignment.training_program?.enable_marks_card && assignment.marks_data && Object.keys(assignment.marks_data).length > 0)) return null;
                        const isC10 = (assignment.training_program?.title || '').toLowerCase().includes('c10') ||
                          (assignment.training_program?.title || '').toLowerCase().includes('c.10');
                        const attendance = attendanceStats[assignment.id!] ?? 0;
                        if (isC10 && attendance < 75) return null;

                        return (
                          <>
                            <div className="mr-2">
                              {assignment.marks_published ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-green-100 text-green-700 border border-green-200">
                                  Published
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                  Draft
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleViewMarksCard(assignment)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="View Marks Card"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handlePublishMarks(assignment)}
                              className={`${assignment.marks_published ? 'text-green-600' : 'text-gray-400'} hover:text-green-700`}
                              title={assignment.marks_published ? "Unpublish Marks" : "Publish Marks"}
                            >
                              <Send size={18} />
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'training' ? (
        <div className="space-y-4">
          {groupAssignmentsByTraining().map((group) => (
            <div key={group.group_id} className={`bg-white rounded-lg shadow overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${group.group_id === 'c10' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' : group.group_id === 'b4' ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200' : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{group.group_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {group.assignments.length} assignment{group.assignments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Completed: {group.assignments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-sm text-gray-600">
                      In Progress: {group.assignments.filter(a => a.status === 'in_progress').length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{role === 'teacher' ? 'Teacher' : 'Assignee'}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {role === 'teacher'
                              ? (assignment.teacher ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}` : 'N/A')
                              : (assignment.mentor ? `${assignment.mentor.first_name} ${assignment.mentor.last_name}` : 'N/A')
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {role === 'teacher'
                              ? (assignment.teacher?.school?.name || 'N/A')
                              : (assignment.mentor?.school?.name || 'N/A')
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${calculateAutoProgress(assignment) === 100 ? 'bg-green-600' :
                                    calculateAutoProgress(assignment) >= 50 ? 'bg-blue-600' :
                                      'bg-yellow-600'
                                    }`}
                                  style={{ width: `${calculateAutoProgress(assignment)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{calculateAutoProgress(assignment)}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(assignment.status)}
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                                {assignment.status.replace('_', ' ')}
                              </span>
                            </div>
                            {assignment.is_self_enrolled && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 uppercase tracking-tighter">
                                <Award size={10} />
                                Self-Enrolled
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openAttendanceModal(assignment)}
                              className="text-green-600 hover:text-green-900"
                              title="Manage Attendance"
                            >
                              <ClipboardCheck size={18} />
                            </button>
                            {canAssign && (
                              <>
                                <button
                                  onClick={() => openEditModal(assignment)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => assignment.id && handleDelete(assignment.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                            {assignment.status === 'completed' && (
                              <button
                                onClick={() => handleGenerateCertificate(assignment)}
                                disabled={
                                  ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                  (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                }
                                className={`hover:text-purple-900 ${((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                  (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-purple-600'
                                  }`}
                                title={
                                  ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                    ? `Attendance too low (${attendanceStats[assignment.id!]}%)`
                                    : (assignment.certificate_issued ? "View Certificate" : "Generate Certificate")
                                }
                              >
                                <Award size={18} />
                              </button>
                            )}
                            {assignment.training_program?.enable_marks_card && assignment.marks_data && Object.keys(assignment.marks_data).length > 0 && (
                              <>
                                <div className="mr-2">
                                  {assignment.marks_published ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-green-100 text-green-700 border border-green-200">
                                      Published
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                      Draft
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleViewMarksCard(assignment)}
                                  disabled={
                                    ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                  }
                                  className={`hover:text-indigo-900 ${((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-indigo-600'
                                    }`}
                                  title={
                                    ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                      (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                      ? `Attendance too low (${attendanceStats[assignment.id!]}%)`
                                      : "View Marks Card"
                                  }
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => handlePublishMarks(assignment)}
                                  disabled={
                                    ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                  }
                                  className={`hover:text-green-900 ${((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : assignment.marks_published ? 'text-green-600' : 'text-gray-400'
                                    }`}
                                  title={assignment.marks_published ? "Unpublish Marks" : "Publish Marks Card"}
                                >
                                  <Send size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {schoolGroups.map((group) => (
            <div key={group.school_id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{group.school_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {group.assignments.length} assignment{group.assignments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Completed: {group.assignments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-sm text-gray-600">
                      In Progress: {group.assignments.filter(a => a.status === 'in_progress').length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{role === 'teacher' ? 'Teacher' : 'Assignee'}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Program</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {role === 'teacher'
                              ? (assignment.teacher ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}` : 'N/A')
                              : (assignment.mentor ? `${assignment.mentor.first_name} ${assignment.mentor.last_name}` : 'N/A')
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{assignment.training_program?.title || 'N/A'}</div>
                          <div className="text-xs text-gray-500">
                            {assignment.training_program?.duration_hours || 0} hours
                            {assignment.training_program?.start_date && assignment.training_program?.end_date && (
                              <span className="ml-2">
                                • {new Date(assignment.training_program.start_date).toLocaleDateString()} - {new Date(assignment.training_program.end_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${calculateAutoProgress(assignment) === 100 ? 'bg-green-600' :
                                    calculateAutoProgress(assignment) >= 50 ? 'bg-blue-600' :
                                      'bg-yellow-600'
                                    }`}
                                  style={{ width: `${calculateAutoProgress(assignment)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{calculateAutoProgress(assignment)}%</span>
                            </div>
                            {assignment.training_program?.start_date && assignment.training_program?.end_date && assignment.status !== 'completed' && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium" title="Progress calculated based on training duration">
                                Auto
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(assignment.status)}
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                                {assignment.status.replace('_', ' ')}
                              </span>
                            </div>
                            {assignment.is_self_enrolled && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 uppercase tracking-tighter">
                                <Award size={10} />
                                Self-Enrolled
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openAttendanceModal(assignment)}
                              className="text-green-600 hover:text-green-900"
                              title="Manage Attendance"
                            >
                              <ClipboardCheck size={18} />
                            </button>
                            {canAssign && (
                              <>
                                <button
                                  onClick={() => openEditModal(assignment)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => assignment.id && handleDelete(assignment.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                            {assignment.status === 'completed' && (
                              <button
                                onClick={() => handleGenerateCertificate(assignment)}
                                disabled={
                                  ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                  (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                }
                                className={`hover:text-purple-900 ${((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                  (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-purple-600'
                                  }`}
                                title={
                                  ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                    ? `Attendance too low (${attendanceStats[assignment.id!]}%)`
                                    : (assignment.certificate_issued ? "View Certificate" : "Generate Certificate")
                                }
                              >
                                <Award size={18} />
                              </button>
                            )}
                            {assignment.training_program?.enable_marks_card && assignment.marks_data && Object.keys(assignment.marks_data).length > 0 && (
                              <>
                                <div className="mr-2">
                                  {assignment.marks_published ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-green-100 text-green-700 border border-green-200">
                                      Published
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                      Draft
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleViewMarksCard(assignment)}
                                  disabled={
                                    ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                  }
                                  className={`hover:text-indigo-900 ${((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-indigo-600'
                                    }`}
                                  title={
                                    ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                      (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                      ? `Attendance too low (${attendanceStats[assignment.id!]}%)`
                                      : "View Marks Card"
                                  }
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => handlePublishMarks(assignment)}
                                  disabled={
                                    ((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                  }
                                  className={`hover:text-green-900 ${((assignment.training_program?.title || '').toLowerCase().includes('c10') || (assignment.training_program?.title || '').toLowerCase().includes('c.10')) &&
                                    (attendanceStats[assignment.id!] !== undefined && attendanceStats[assignment.id!] < 75)
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : assignment.marks_published ? 'text-green-600' : 'text-gray-400'
                                    }`}
                                  title={assignment.marks_published ? "Unpublish Marks" : "Publish Marks Card"}
                                >
                                  <Send size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Target className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No training assignments found. Assign your first training to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">{role === 'teacher' ? 'Teacher' : 'Mentor'} *</label>
                    {role === 'mentor' && (
                      <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeTeachers}
                          onChange={(e) => setIncludeTeachers(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Include Teachers
                      </label>
                    )}
                  </div>
                  <select
                    required
                    value={role === 'teacher' ? formData.teacher_id : formData.mentor_id}
                    onChange={(e) => setFormData({
                      ...formData,
                      teacher_id: role === 'teacher' ? e.target.value : '',
                      mentor_id: role === 'mentor' ? e.target.value : ''
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select {role === 'teacher' ? 'Teacher' : 'Assignee'}</option>
                    {role === 'teacher' ? (
                      teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.first_name} {teacher.last_name} ({teacher.school?.name || 'Unassigned'})
                        </option>
                      ))
                    ) : (
                      (includeTeachers ? [...mentors, ...teachers] : mentors)
                        .sort((a, b) => a.first_name.localeCompare(b.first_name))
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} ({user.school?.name || 'Unassigned'}) {teachers.find(t => t.id === user.id) ? '(Teacher)' : ''}
                          </option>
                        ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Program *</label>
                  <select
                    required
                    value={formData.training_program_id}
                    onChange={(e) => setFormData({ ...formData, training_program_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score (%)</label>
                  {(() => {
                    const selectedProgram = programs.find(p => p.id === formData.training_program_id);
                    if (selectedProgram?.enable_marks_card && selectedProgram.marks_configuration?.subjects?.length) {
                      return (
                        <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 font-medium">Detailed Marks Entry</p>
                          {selectedProgram.marks_configuration.subjects.map((sub, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <label className="text-sm text-gray-700">{sub.name} <span className="text-xs text-gray-500">({sub.max_marks})</span></label>
                              <input
                                type="number"
                                min="0"
                                max={sub.max_marks}
                                step="0.01"
                                value={formData.marks_data[sub.name] || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  const newVal = isNaN(val) ? 0 : val;
                                  setFormData(prev => ({
                                    ...prev,
                                    marks_data: {
                                      ...prev.marks_data,
                                      [sub.name]: Math.min(newVal, sub.max_marks)
                                    }
                                  }));
                                }}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                          <div className="pt-2 border-t border-gray-200 text-right">
                            <span className="text-xs font-bold text-gray-700">Total Score will be calculated automatically</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.score}
                        onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
                <input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAssignment ? 'Update' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }

      {
        showAttendanceModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-xl font-bold">Attendance Management</h3>
                <p className="text-gray-600">
                  {role === 'teacher'
                    ? `${selectedAssignment.teacher?.first_name} ${selectedAssignment.teacher?.last_name}`
                    : `${selectedAssignment.mentor?.first_name} ${selectedAssignment.mentor?.last_name}`
                  } - {selectedAssignment.training_program?.title}
                </p>
              </div>

              <form onSubmit={handleAttendanceSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900">Record New Attendance</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date * (Today or Yesterday)</label>
                    <input
                      type="date"
                      required
                      value={attendanceForm.attendance_date}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, attendance_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={attendanceForm.status}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={attendanceForm.notes}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Record Attendance
                </button>
              </form>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-3">Attendance History</h4>
                {attendanceRecords.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attendance records yet</p>
                ) : (
                  <div className="space-y-2">
                    {attendanceRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="font-medium">{new Date(record.attendance_date).toLocaleDateString()}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {record.status}
                          </span>
                          {record.notes && (
                            <span className="text-sm text-gray-600">{record.notes}</span>
                          )}
                        </div>
                        <button
                          onClick={() => record.id && handleDeleteAttendance(record.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showBulkAttendanceModal && selectedProgram && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Bulk Attendance Recording</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Training Program</label>
                <select
                  value={selectedProgram.id}
                  onChange={(e) => {
                    const program = programs.find(p => p.id === e.target.value);
                    if (program) openBulkAttendanceModal(program);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.title}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleBulkAttendanceSubmit} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Attendance Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date * (Today or Yesterday)</label>
                      <input
                        type="date"
                        required
                        value={bulkAttendanceForm.attendance_date}
                        onChange={(e) => setBulkAttendanceForm({ ...bulkAttendanceForm, attendance_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                      <select
                        value={bulkAttendanceForm.status}
                        onChange={(e) => setBulkAttendanceForm({ ...bulkAttendanceForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={bulkAttendanceForm.notes}
                        onChange={(e) => setBulkAttendanceForm({ ...bulkAttendanceForm, notes: e.target.value })}
                        placeholder="Optional notes"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">
                        Select Teachers ({Object.values(bulkAttendanceData).filter(Boolean).length} selected)
                      </h4>
                      <button
                        type="button"
                        onClick={toggleAllTeachers}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {assignments.filter(a => a.training_program_id === selectedProgram.id).every(a => a.id && bulkAttendanceData[a.id])
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by teacher name, phone, or school..."
                      value={bulkAttendanceSearchTerm}
                      onChange={(e) => setBulkAttendanceSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto p-4">
                    {(() => {
                      let programAssignments = assignments.filter(a => a.training_program_id === selectedProgram.id);

                      // Apply search filter
                      if (bulkAttendanceSearchTerm.trim()) {
                        const searchLower = bulkAttendanceSearchTerm.toLowerCase();
                        programAssignments = programAssignments.filter(a => {
                          const user = role === 'teacher' ? a.teacher : a.mentor;
                          const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.toLowerCase();
                          const phone = (user?.phone || '').toLowerCase();
                          const schoolName = (user?.school?.name || '').toLowerCase();
                          return fullName.includes(searchLower) || phone.includes(searchLower) || schoolName.includes(searchLower);
                        });
                      }

                      if (programAssignments.length === 0) {
                        return <p className="text-gray-500 text-center py-4">No teachers assigned to this training program</p>;
                      }

                      const groupedBySchool = new Map<string, AssignmentWithDetails[]>();
                      programAssignments.forEach(assignment => {
                        const user = role === 'teacher' ? assignment.teacher : assignment.mentor;
                        const schoolId = user?.school_id || 'unassigned';
                        if (!groupedBySchool.has(schoolId)) {
                          groupedBySchool.set(schoolId, []);
                        }
                        groupedBySchool.get(schoolId)!.push(assignment);
                      });

                      const sortedGroups = Array.from(groupedBySchool.entries()).sort((a, b) => {
                        const userA = role === 'teacher' ? a[1][0]?.teacher : a[1][0]?.mentor;
                        const userB = role === 'teacher' ? b[1][0]?.teacher : b[1][0]?.mentor;
                        const schoolA = userA?.school?.name || 'Unknown';
                        const schoolB = userB?.school?.name || 'Unknown';
                        return schoolA.localeCompare(schoolB);
                      });

                      return (
                        <div className="space-y-3">
                          {sortedGroups.map(([schoolId, schoolAssignments]) => {
                            const firstUser = role === 'teacher' ? schoolAssignments[0]?.teacher : schoolAssignments[0]?.mentor;
                            const schoolName = firstUser?.school?.name || 'Unknown School';
                            return (
                              <div key={schoolId} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 border-b border-blue-200">
                                  <h5 className="font-semibold text-gray-900">{schoolName}</h5>
                                  <p className="text-xs text-gray-600">
                                    {schoolAssignments.length} teacher{schoolAssignments.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div className="space-y-1 p-2">
                                  {schoolAssignments.map((assignment) => {
                                    const user = role === 'teacher' ? assignment.teacher : assignment.mentor;
                                    return (
                                      <label
                                        key={assignment.id}
                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={assignment.id ? !!bulkAttendanceData[assignment.id] : false}
                                          onChange={() => assignment.id && toggleTeacherSelection(assignment.id)}
                                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 text-sm">
                                            {user?.first_name} {user?.last_name}
                                          </div>
                                          <div className="text-xs text-gray-500 truncate">
                                            {user?.email}
                                          </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                          assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                            assignment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                              'bg-gray-100 text-gray-800'
                                          }`}>
                                          {assignment.status.replace('_', ' ')}
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkAttendanceModal(false);
                      setBulkAttendanceData({});
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Record Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Bulk Marks Entry Modal */}
      {showBulkMarksModal && bulkMarksProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Bulk Marks Entry</h3>
                <p className="text-sm text-gray-600 mt-1">Enter marks for teachers in {bulkMarksProgram.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkMarksModal(false);
                  setBulkMarksData({});
                  setBulkMarksProgram(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Program Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Training Program</label>
              <select
                value={bulkMarksProgram.id}
                onChange={(e) => {
                  const program = programs.find(p => p.id === e.target.value);
                  if (program) openBulkMarksModal(program);
                }}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {programs.filter(p => p.enable_marks_card && p.marks_configuration?.subjects?.length).map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats Bar */}
            <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <span className="text-gray-500">Total Teachers:</span>{' '}
                <span className="font-bold">{assignments.filter(a => a.training_program_id === bulkMarksProgram.id).length}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">With Marks:</span>{' '}
                <span className="font-bold text-blue-600">
                  {assignments.filter(a => a.training_program_id === bulkMarksProgram.id && a.marks_data && Object.keys(a.marks_data).length > 0).length}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Published:</span>{' '}
                <span className="font-bold text-green-600">
                  {assignments.filter(a => a.training_program_id === bulkMarksProgram.id && a.marks_published).length}
                </span>
              </div>
            </div>

            {/* Marks Entry Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-indigo-50">
                        Teacher
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        School
                      </th>
                      {bulkMarksProgram.marks_configuration?.subjects?.map((subject, idx) => (
                        <th key={idx} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          {subject.name}
                          <div className="text-xs font-normal text-gray-500">Max: {subject.max_marks}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments
                      .filter(a => a.training_program_id === bulkMarksProgram.id)
                      .map((assignment) => {
                        const user = role === 'teacher' ? assignment.teacher : assignment.mentor;
                        const marksData = bulkMarksData[assignment.id!] || {};
                        const totalMax = bulkMarksProgram.marks_configuration?.subjects?.reduce((sum, s) => sum + s.max_marks, 0) || 0;
                        const totalObtained = Object.values(marksData).reduce((sum, val) => sum + (val || 0), 0);

                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                              <div className="font-medium text-gray-900 text-sm">
                                {user?.first_name} {user?.last_name}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{user?.school?.name || 'Unassigned'}</div>
                            </td>
                            {bulkMarksProgram.marks_configuration?.subjects?.map((subject, idx) => (
                              <td key={idx} className="px-4 py-3 whitespace-nowrap text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={subject.max_marks}
                                  step="0.01"
                                  value={marksData[subject.name] || ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const newVal = isNaN(val) ? 0 : val;
                                    setBulkMarksData(prev => ({
                                      ...prev,
                                      [assignment.id!]: {
                                        ...prev[assignment.id!],
                                        [subject.name]: Math.min(newVal, subject.max_marks)
                                      }
                                    }));
                                  }}
                                  className="w-16 px-2 py-1 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  disabled={assignment.marks_published}
                                />
                              </td>
                            ))}
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="font-bold text-gray-900">{totalObtained}</span>
                              <span className="text-gray-500">/{totalMax}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {assignment.marks_published ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Published
                                </span>
                              ) : assignment.marks_data && Object.keys(assignment.marks_data).length > 0 ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Draft
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowBulkMarksModal(false);
                  setBulkMarksData({});
                  setBulkMarksProgram(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBulkMarksSave}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <FileText size={18} />
                  Save Marks
                </button>
                <button
                  type="button"
                  onClick={handleBulkPublishMarks}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Send size={18} />
                  Publish All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {
        showBulkAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">Bulk Assign Training</h3>
                <form onSubmit={handleBulkAssign} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Training Program *</label>
                    <select
                      value={bulkAssignForm.training_program_id}
                      onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, training_program_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Program</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>{program.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">School Filter</label>
                      {role === 'mentor' && (
                        <label className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeTeachers}
                            onChange={(e) => setIncludeTeachers(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Include Teachers
                        </label>
                      )}
                    </div>
                    <select
                      value={bulkAssignForm.school_id}
                      onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, school_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All My Schools</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      This will assign all active {role === 'teacher' ? 'teachers' : (includeTeachers ? 'mentors and teachers' : 'mentors')} from selected school(s) to the training program
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={bulkAssignForm.due_date}
                      onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> {role === 'teacher' ? 'Teachers' : 'Mentors'} who are already assigned to this program will be skipped.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkAssignModal(false);
                        setBulkAssignForm({
                          training_program_id: '',
                          due_date: '',
                          school_id: 'all',
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Assign All {role === 'teacher' ? 'Teachers' : 'Mentors'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {
        confirmDialog && (
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText}
            cancelText="Cancel"
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
            type={confirmDialog.type}
          />
        )
      }

      {
        notification && (
          <Notification
            isOpen={notification.isOpen}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )
      }
      {
        showCertificateModal && certificateAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 no-print">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold">Training Documents</h3>
                  {certificateAssignment.training_program?.enable_marks_card && (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setCertificateModalMode('certificate')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${certificateModalMode === 'certificate' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                          }`}
                      >
                        Certificate
                      </button>
                      <button
                        onClick={() => setCertificateModalMode('marks_card')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${certificateModalMode === 'marks_card' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                          }`}
                      >
                        Marks Card
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FileText size={20} />
                    Download PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Printer size={20} />
                    Print
                  </button>
                  <button
                    onClick={() => setShowCertificateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>


              {/* Printable Content Area */}
              <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center">
                <div ref={certificateRef} id="certificate-print-area" className="bg-white shadow-lg print:shadow-none print:w-full">
                  {/* Certificate View */}
                  {(() => {
                    const isC10 = (certificateAssignment.training_program?.title || '').toLowerCase().includes('c10') ||
                      (certificateAssignment.training_program?.title || '').toLowerCase().includes('c.10');
                    const attendance = attendanceStats[certificateAssignment.id!] ?? 0;
                    if (isC10 && attendance < 75) {
                      return (
                        <div className="p-8 text-center bg-white rounded-lg w-[800px]">
                          <p className="text-red-600 font-bold">Access Denied: Attendance criteria (min 75%) not met.</p>
                        </div>
                      );
                    }

                    if (certificateModalMode === 'certificate') {
                      return certificateAssignment.training_program?.certificate_template_id ? (
                        <RenderedTemplate
                          template={templates.find(t => t.id === certificateAssignment.training_program?.certificate_template_id) || {
                            title: 'Error', type: 'certificate', width: 794, height: 1123, elements: [], created_at: '', updated_at: ''
                          }}
                          data={{ assignment: certificateAssignment, role: role }}
                        />
                      ) : (
                        // Fallback to Default Design
                        <div className="w-[800px] h-[600px] p-10 border-[20px] border-double border-gray-200 relative flex flex-col items-center justify-center text-center bg-white">
                          <div className="absolute top-10 left-10 w-20 h-20 border-t-4 border-l-4 border-blue-900"></div>
                          <div className="absolute top-10 right-10 w-20 h-20 border-t-4 border-r-4 border-blue-900"></div>
                          <div className="absolute bottom-10 left-10 w-20 h-20 border-b-4 border-l-4 border-blue-900"></div>
                          <div className="absolute bottom-10 right-10 w-20 h-20 border-b-4 border-r-4 border-blue-900"></div>

                          <div className="absolute top-8 left-8">
                            <img src="/hauna_logo.png" alt="Hauna Logo" className="h-16 object-contain" />
                          </div>
                          <div className="mb-8">
                            <Award size={64} className="text-blue-900 mx-auto" />
                            <h1 className="text-4xl font-serif text-blue-900 mt-4 tracking-wider uppercase">
                              {(certificateAssignment.training_program?.title || '').toLowerCase().includes('c10') || (certificateAssignment.training_program?.title || '').toLowerCase().includes('c.10')
                                ? 'Certificate of Participation'
                                : 'Certificate of Completion'}
                            </h1>
                          </div>

                          <div className="space-y-6 max-w-2xl">
                            <p className="text-xl text-gray-600 font-serif italic">This is to certify that</p>

                            <h2 className="text-4xl font-bold text-gray-900 font-serif border-b-2 border-gray-300 pb-2 inline-block px-10">
                              {certificateAssignment.teacher ? `${certificateAssignment.teacher.first_name} ${certificateAssignment.teacher.last_name}` :
                                certificateAssignment.mentor ? `${certificateAssignment.mentor.first_name} ${certificateAssignment.mentor.last_name}` : 'Trainee'}
                            </h2>

                            <p className="text-xl text-gray-600 font-serif italic">has successfully completed the training program</p>

                            <h3 className="text-3xl font-bold text-blue-800 font-serif">
                              {certificateAssignment.training_program?.title}
                            </h3>

                            <p className="text-lg text-gray-600 font-serif">
                              {certificateAssignment.training_program?.start_date && certificateAssignment.training_program?.end_date ? (
                                <span>
                                  from {new Date(certificateAssignment.training_program.start_date).toLocaleDateString()} to {new Date(certificateAssignment.training_program.end_date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span>on {new Date().toLocaleDateString()}</span>
                              )}
                            </p>

                            {certificateAssignment.score !== undefined && (
                              <p className="text-lg text-gray-500 font-serif mt-4">
                                Score Achieved: <span className="font-bold text-gray-900">{certificateAssignment.score}%</span>
                              </p>
                            )}

                            <p className="text-lg text-gray-500 font-serif mt-2">
                              Overall Attendance: <span className="font-bold text-gray-900">{attendanceStats[certificateAssignment.id!] ?? 0}%</span>
                            </p>
                          </div>

                          <div className="mt-16 mb-10 flex justify-between w-full px-32 relative z-10">
                            <div className="text-center">
                              <div className="mb-[-5px]">
                                <p className="font-medium text-lg border-b border-gray-400 pb-1">{new Date().toLocaleDateString()}</p>
                              </div>
                              <p className="text-sm text-gray-500 uppercase tracking-widest mt-2">Date Issued</p>
                            </div>
                            <div className="text-center relative">
                              {certificateAssignment.training_program?.signature_url ? (
                                <div className="mb-[-5px]">
                                  <img
                                    src={certificateAssignment.training_program.signature_url}
                                    alt="Signature"
                                    className="h-16 object-contain border-b border-gray-400 pb-1 mx-auto"
                                  />
                                </div>
                              ) : (
                                ((certificateAssignment.training_program?.title || '').toLowerCase().includes('c10') || (certificateAssignment.training_program?.title || '').toLowerCase().includes('c.10')) && (
                                  <div className="mb-[-5px]">
                                    <p className="font-script text-3xl text-blue-900 border-b border-gray-400 pb-1">Authorized Signatory</p>
                                  </div>
                                )
                              )}
                              <p className="text-sm text-gray-500 uppercase tracking-widest mt-2">Director Signature</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (certificateModalMode === 'marks_card') {
                      return certificateAssignment.training_program?.marks_card_template_id ? (
                        <RenderedTemplate
                          template={templates.find(t => t.id === certificateAssignment.training_program?.marks_card_template_id) || {
                            title: 'Error', type: 'marks_card', width: 794, height: 1123, elements: [], created_at: '', updated_at: ''
                          }}
                          data={{ assignment: certificateAssignment, role: role }}
                        />
                      ) : (
                        <div className="w-[210mm] min-h-[297mm] p-0 bg-white shadow-2xl relative overflow-hidden font-sans border border-gray-100 print:shadow-none print:w-[210mm] print:h-[297mm]">
                          {/* Decorative Background Pattern */}
                          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2563eb 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}></div>

                          {/* Premium Wavy Header */}
                          <div className="relative h-44 overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-br from-blue-50 via-white to-blue-50"></div>
                            <div className="absolute bottom-0 left-0 right-0">
                              <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-16">
                                <path d="M0 60L60 55C120 50 240 40 360 45C480 50 600 70 720 75C840 80 960 70 1080 60C1200 50 1320 40 1380 35L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V60Z" fill="white" />
                                <path d="M0 30L60 35C120 40 240 50 360 45C480 40 600 20 720 15C840 10 960 20 1080 30C1200 40 1320 50 1380 55L1440 60V0H1380C1320 0 1200 0 1080 0C960 0 840 0 720 0C600 0 480 0 360 0C240 0 120 0 60 0H0V30Z" fill="#dbeafe" opacity="0.5" />
                              </svg>
                            </div>

                            <div className="relative z-10 flex flex-col items-center pt-6">
                              <img src="/hauna_logo.png" alt="Hauna Logo" className="h-16 object-contain mb-1" />
                              <h2 className="text-[10px] font-bold text-blue-900 tracking-[0.2em] mb-1">Millat Centre for Research and Training</h2>
                              <div className="w-16 h-0.5 bg-blue-600 rounded-full mb-2"></div>
                              <h1 className="text-3xl font-extrabold text-blue-950 uppercase tracking-wider font-serif">Statement of Marks</h1>
                            </div>
                          </div>

                          <div className="px-8 py-4">
                            {/* Academic Details & Result Summary Grid */}
                            <div className="grid grid-cols-5 border-2 border-blue-900 rounded-lg overflow-hidden mb-4">
                              {/* Left Column: Details */}
                              <div className="col-span-3 border-r-2 border-blue-900">
                                {[
                                  { label: 'Academic Year', value: '2025-26' },
                                  { label: 'Programme', value: (certificateAssignment.training_program?.title || 'N/A') + ' Induction Training' },
                                  { label: 'Batch Name', value: ((certificateAssignment.training_program?.title || '').toLowerCase().includes('c10') || (certificateAssignment.training_program?.title || '').toLowerCase().includes('c.10')) ? 'C.10 Batch' : 'Regular' },
                                  { label: 'Course Code', value: certificateAssignment.training_program?.id?.slice(-6).toUpperCase() || 'TRN-001' },
                                  { label: 'Student Name', value: certificateAssignment.teacher ? `${certificateAssignment.teacher.first_name} ${certificateAssignment.teacher.last_name}` : certificateAssignment.mentor ? `${certificateAssignment.mentor.first_name} ${certificateAssignment.mentor.last_name}` : 'Trainee' },
                                  { label: 'School Name', value: certificateAssignment.teacher?.school?.name || certificateAssignment.mentor?.school?.name || 'N/A' },
                                  { label: 'Date of Issue', value: new Date().toLocaleDateString('en-IN') }
                                ].map((item, idx) => (
                                  <div key={idx} className={`grid grid-cols-2 border-b-2 border-blue-900 last:border-b-0`}>
                                    <div className="bg-blue-50 px-3 py-1.5 font-bold text-blue-900 text-[11px] border-r-2 border-blue-900 flex items-center">{item.label}</div>
                                    <div className="px-3 py-1.5 text-gray-800 font-semibold text-[11px] flex items-center bg-white">{item.value}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Right Column: Result Summary */}
                              <div className="col-span-2">
                                <div className="bg-blue-100 px-3 py-2 font-black text-blue-950 text-center uppercase tracking-widest border-b-2 border-blue-900 text-[12px]">Result Summary</div>
                                <div className="p-3 space-y-2 bg-blue-50/30 h-full">
                                  <div className="border-b border-blue-200 pb-1">
                                    <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Total Marks Obtained</p>
                                    <p className="text-lg font-black text-blue-950">
                                      {Object.values(certificateAssignment.marks_data || {}).reduce((sum, val) => sum + (val as number), 0)} / {certificateAssignment.training_program?.marks_configuration?.subjects.reduce((sum, s) => sum + s.max_marks, 0)}
                                    </p>
                                  </div>
                                  <div className="border-b border-blue-200 pb-1">
                                    <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Percentage</p>
                                    <p className="text-lg font-black text-blue-950">
                                      {(() => {
                                        const subjects = certificateAssignment.training_program?.marks_configuration?.subjects || [];
                                        const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
                                        const totalObtained = Object.values(certificateAssignment.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0);
                                        return totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                                      })()}%
                                    </p>
                                  </div>
                                  <div className="border-b border-blue-200 pb-1">
                                    <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Overall Grade</p>
                                    <p className="text-lg font-black text-blue-950">
                                      {(() => {
                                        const subjects = certificateAssignment.training_program?.marks_configuration?.subjects || [];
                                        const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
                                        const totalObtained = Object.values(certificateAssignment.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0);
                                        return getComponentGrade('Overall', totalObtained, totalMax);
                                      })()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Remarks</p>
                                    <p className="text-[12px] font-serif italic text-blue-900 leading-tight">
                                      Excellent Performance. The candidate has demonstrated exceptional understanding of the core training components.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Main Marks Table */}
                            <div className="mb-4 border-2 border-blue-900 rounded-lg overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-2">
                                <h3 className="text-white font-bold uppercase tracking-wider text-center text-sm">Marks Details</h3>
                              </div>
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-blue-50 border-b-2 border-blue-900">
                                    <th className="px-3 py-2 text-left font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900 w-12 text-center">Sl.No</th>
                                    <th className="px-3 py-2 text-left font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900">Course Component</th>
                                    <th className="px-3 py-2 text-center font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900 w-32">Max Marks</th>
                                    <th className="px-3 py-2 text-center font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900 w-32">Marks Obtained</th>
                                    <th className="px-3 py-2 text-center font-bold text-blue-950 uppercase text-[10px] w-24">Grade</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-blue-900">
                                  {certificateAssignment.training_program?.marks_configuration?.subjects.map((subject, index) => (
                                    <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                                      <td className="px-3 py-1.5 text-center text-[11px] font-bold text-blue-900 border-r-2 border-blue-900 bg-white">{index + 1}</td>
                                      <td className="px-3 py-1.5 text-[11px] font-bold text-gray-800 border-r-2 border-blue-900 bg-white">{subject.name}</td>
                                      <td className="px-3 py-1.5 text-center text-[11px] font-black text-gray-600 border-r-2 border-blue-900 bg-white">{subject.max_marks}</td>
                                      <td className="px-3 py-1.5 text-center text-[11px] font-black text-blue-600 border-r-2 border-blue-900 bg-white">
                                        {certificateAssignment.marks_data?.[subject.name] ?? '-'}
                                      </td>
                                      <td className="px-3 py-1.5 text-center text-[11px] font-black text-blue-900 bg-white">
                                        {getComponentGrade(subject.name, certificateAssignment.marks_data?.[subject.name] as number, subject.max_marks)}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Total Row */}
                                  <tr className="bg-blue-100/50 font-black border-t-2 border-blue-900">
                                    <td className="px-3 py-2 text-center border-r-2 border-blue-900 text-[11px]"></td>
                                    <td className="px-3 py-2 text-right border-r-2 border-blue-900 uppercase tracking-widest text-[10px]">Total Aggregate</td>
                                    <td className="px-3 py-2 text-center border-r-2 border-blue-900 text-[11px]">
                                      {certificateAssignment.training_program?.marks_configuration?.subjects.reduce((sum, s) => sum + s.max_marks, 0)}
                                    </td>
                                    <td className="px-3 py-2 text-center border-r-2 border-blue-900 text-blue-700 text-sm">
                                      {Object.values(certificateAssignment.marks_data || {}).reduce((sum, val) => sum + (val as number), 0)}
                                    </td>
                                    <td className="px-3 py-2 text-center text-blue-900 text-[11px]">
                                      {(() => {
                                        const subjects = certificateAssignment.training_program?.marks_configuration?.subjects || [];
                                        const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
                                        const totalObtained = Object.values(certificateAssignment.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0);
                                        return getComponentGrade('Overall', totalObtained, totalMax);
                                      })()}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Certification Text */}
                            <div className="mb-6 bg-blue-50/50 p-4 rounded-lg border-l-4 border-blue-900">
                              <p className="text-blue-950 font-serif leading-relaxed text-center text-[13px]">
                                This is to certify that <span className="font-bold text-base underline decoration-blue-300 underline-offset-4">{certificateAssignment.teacher ? `${certificateAssignment.teacher.first_name} ${certificateAssignment.teacher.last_name}` : certificateAssignment.mentor ? `${certificateAssignment.mentor.first_name} ${certificateAssignment.mentor.last_name}` : 'Trainee'}</span> has successfully completed the <span className="font-bold">{certificateAssignment.training_program?.title}</span> training program organized by Millat Centre for Research and Training for the academic year 2025-26.
                              </p>
                            </div>

                            {/* Signatures Section */}
                            <div className="flex justify-between items-end px-12 pb-4">
                              <div className="w-40 h-16 mb-1"></div>

                              {/* Seal Image */}
                              <div className="flex items-center justify-center transform translate-y-4">
                                <img src="/maarif_seal.png" alt="Maarif Seal" className="w-32 h-auto object-contain opacity-90" />
                              </div>

                              <div className="text-center">
                                <div className="w-40 h-16 mb-1 relative flex items-center justify-center">
                                  {certificateAssignment.training_program?.signature_url ? (
                                    <img src={certificateAssignment.training_program.signature_url} alt="Director Signature" className="h-12 object-contain" />
                                  ) : (
                                    <div className="absolute inset-0 border-b-2 border-blue-900 flex items-center justify-center">
                                      <span className="text-blue-900 font-script text-2xl opacity-80">Director</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] font-black text-blue-950 uppercase tracking-widest mb-0.5">Director</p>
                                <p className="text-[9px] text-gray-500 font-serif italic">(Millat Centre for Research and Training)</p>
                              </div>
                            </div>
                          </div>

                          {/* Organised Under Text */}
                          <div className="text-center pb-2">
                            <p className="text-[10px] text-blue-900/60 font-serif italic">This program is organised under 'Maarif Educational and Charitable Trust' Bengaluru</p>
                          </div>

                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>


                <style>{`
                @media print {
                  @page {
                    size: ${certificateModalMode === 'certificate' ? 'A4 landscape' : 'A4 portrait'};
                    margin: 0;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .no-print {
                    display: none;
                  }
                  #certificate-print-area, #certificate-print-area * {
                    visibility: visible;
                  }
                  #certificate-print-area {
                    position: fixed;
                    left: 0;
                    top: 0;
                    width: ${certificateModalMode === 'certificate' ? '297mm' : '210mm'};
                    height: ${certificateModalMode === 'certificate' ? '210mm' : '297mm'};
                    margin: 0;
                    padding: 0 !important;
                    box-shadow: none;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                  }
                  /* Ensure the content inside fits perfectly */
                  #certificate-print-area > div {
                    width: ${certificateModalMode === 'certificate' ? '297mm' : '210mm'};
                    height: ${certificateModalMode === 'certificate' ? '210mm' : '297mm'};
                    transform-origin: center;
                  }
                }
                .font-script {
                  font-family: 'Brush Script MT', cursive;
                }
              `}</style>
              </div >
            </div >
          </div >
        )
      }
    </div >
  );
}
