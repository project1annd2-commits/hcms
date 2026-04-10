import React from 'react';
import { AssignmentWithDetails } from '../../lib/models';
import { TrainingProgram } from '../../lib/models';
import { Clock, CheckCircle2, AlertCircle, Target } from 'lucide-react';

export const getLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateAutoProgress = (assignment: AssignmentWithDetails): number => {
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
    return assignment.progress_percentage || 0;
  }

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const autoProgress = Math.round((daysPassed / totalDays) * 100);

  return Math.min(100, Math.max(0, autoProgress));
};

export type SchoolGroup = {
  school_id: string;
  school_name: string;
  assignments: AssignmentWithDetails[];
};

export const groupAssignmentsBySchool = (
  assignments: AssignmentWithDetails[],
  role: 'teacher' | 'mentor',
  selectedSchoolFilter?: string
): SchoolGroup[] => {
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
    if (a.school_id === 'unassigned') return 1;
    if (b.school_id === 'unassigned') return -1;
    return a.school_name.localeCompare(b.school_name);
  });
};

export type TrainingGroup = {
  group_id: string;
  group_name: string;
  assignments: AssignmentWithDetails[];
};

export const groupAssignmentsByTraining = (
  assignments: AssignmentWithDetails[],
  role: 'teacher' | 'mentor',
  selectedSchoolFilter?: string
): TrainingGroup[] => {
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

export const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="text-green-600" size={20} />;
    case 'in_progress': return <Clock className="text-blue-600" size={20} />;
    case 'overdue': return <AlertCircle className="text-red-600" size={20} />;
    default: return <Target className="text-gray-600" size={20} />;
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'overdue': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export type AssignmentFormData = {
  training_program_id: string;
  teacher_id: string;
  mentor_id: string;
  due_date: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  progress_percentage: number;
  completion_date: string;
  score: string;
  marks_data: Record<string, number>;
};

export const getInitialFormData = (): AssignmentFormData => ({
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

export type BulkAssignFormData = {
  training_program_id: string;
  due_date: string;
  school_id: string;
};

export const getInitialBulkAssignForm = (): BulkAssignFormData => ({
  training_program_id: '',
  due_date: '',
  school_id: 'all',
});

export type BulkAttendanceFormData = {
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
};

export const getInitialBulkAttendanceForm = (): BulkAttendanceFormData => ({
  attendance_date: getLocalDate(),
  status: 'present',
  notes: '',
});

export const isC10Program = (program: TrainingProgram): boolean => {
  const title = program.title || '';
  return title.toLowerCase().includes('c10') || title.toLowerCase().includes('c.10');
};

export const calculateScoreFromMarks = (
  marksData: Record<string, number>,
  subjects: { name: string; max_marks: number }[]
): number | null => {
  let totalObtained = 0;
  let totalMax = 0;
  subjects.forEach(sub => {
    totalObtained += (marksData[sub.name] || 0);
    totalMax += sub.max_marks;
  });
  if (totalMax > 0) {
    return Math.round((totalObtained / totalMax) * 100);
  }
  return null;
};

export type ConfirmDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info';
};

export type NotificationState = {
  isOpen: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
};