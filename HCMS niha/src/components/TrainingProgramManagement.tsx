import { useState, useEffect } from 'react';
import { TrainingProgram, Permission, EmployeeStat, User, CertificateTemplate, TrainingAssignment, MentorTrainingAssignment, Teacher, Mentor, School } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, Users, Archive, BookOpen, LayoutTemplate, Eye, Award, UserPlus } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

import TemplateDesigner from './TemplateDesigner/TemplateDesigner';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
  onNavigateToAssignments?: () => void;
}

type ProgramWithAssignments = TrainingProgram & {
  assignmentCount: number;
  employeeCount: number;
};

type AssignmentDetail = {
  assignee_name: string;
  assignee_type: 'teacher' | 'mentor';
  school_name: string;
  assigned_by_name: string;
  manager_name: string; // School Manager
  status: string;
};



export default function TrainingProgramManagement({ currentUser, currentPermissions, onNavigateToAssignments }: Props) {
  const [programs, setPrograms] = useState<ProgramWithAssignments[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<AssignmentDetail[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsAssignerFilter, setDetailsAssignerFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [filterStatus, _setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_hours: 0,
    category: '',
    target_audience: 'all' as 'management' | 'teachers' | 'mentors' | 'all',
    status: 'active' as 'active' | 'archived',
    start_date: '',
    end_date: '',
    meeting_link: '',
    enable_marks_card: false,
    marks_configuration: { subjects: [] as { name: string; max_marks: number }[] },
    enable_certificate: false,
    certificate_template_id: '',
    marks_card_template_id: '',
    signature_url: '',
  });
  const [subjectInput, setSubjectInput] = useState({ name: '', max_marks: 100 });
  const [employeeStats, setEmployeeStats] = useState<EmployeeStat[]>([]);

  // Template Management State
  const [templates, _setTemplates] = useState<CertificateTemplate[]>([]);
  const [showDesigner, setShowDesigner] = useState(false);
  const [_designerMode, _setDesignerMode] = useState<'create' | 'edit'>('create');
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | undefined>(undefined);
  const [_notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info'; title: string; message: string; } | null>(null);

  const canManage = currentPermissions.can_manage_training_programs;
  const canAssign = currentPermissions.can_assign_training || currentUser.role === 'employee';
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadPrograms();
    if (isAdmin) {
      loadEmployeeStats();
    }
  }, [filterStatus]);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const filter: any = {};
      if (filterStatus !== 'all') {
        filter.status = filterStatus;
      }

      const data = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, filter, { sort: { title: 1 } });

      if (data) {
        // Fetch both teacher and mentor assignments
        const [teacherAssignments, mentorAssignments] = await Promise.all([
          db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, {}),
          db.find<MentorTrainingAssignment>(Collections.MENTOR_TRAINING_ASSIGNMENTS, {})
        ]);

        const countMap = new Map<string, number>();
        const employeeMap = new Map<string, Set<string>>();

        // Process teacher assignments
        teacherAssignments.forEach(a => {
          const pid = a.training_program_id;
          countMap.set(pid, (countMap.get(pid) || 0) + 1);
          if (a.assigned_by) {
            if (!employeeMap.has(pid)) {
              employeeMap.set(pid, new Set());
            }
            employeeMap.get(pid)!.add(a.assigned_by);
          }
        });

        // Process mentor assignments
        mentorAssignments.forEach(a => {
          const pid = a.training_program_id;
          countMap.set(pid, (countMap.get(pid) || 0) + 1);
          if (a.assigned_by) {
            if (!employeeMap.has(pid)) {
              employeeMap.set(pid, new Set());
            }
            employeeMap.get(pid)!.add(a.assigned_by);
          }
        });

        const programsWithCounts = data.map(program => ({
          ...program,
          assignmentCount: countMap.get(program.id!) || 0,
          employeeCount: employeeMap.get(program.id!)?.size || 0,
        }));

        setPrograms(programsWithCounts);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeStats = async () => {
    try {
      // Fetch both teacher and mentor training assignments
      const [teacherAssignments, mentorAssignments] = await Promise.all([
        db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, {}),
        db.find<MentorTrainingAssignment>(Collections.MENTOR_TRAINING_ASSIGNMENTS, {})
      ]);

      // Group by employee and count (combining both collections)
      const statsMap = new Map<string, number>();
      [...teacherAssignments, ...mentorAssignments].forEach(assignment => {
        if (assignment.assigned_by) {
          statsMap.set(assignment.assigned_by, (statsMap.get(assignment.assigned_by) || 0) + 1);
        }
      });

      // Fetch employee names
      const employeeIds = Array.from(statsMap.keys());
      const employees = await db.find<User>(Collections.USERS, {
        id: { $in: employeeIds }
      });

      // Map to EmployeeStat array
      const stats: EmployeeStat[] = employees.map(emp => ({
        employee_id: emp.id!,
        employee_name: emp.full_name,
        assignment_count: statsMap.get(emp.id!) || 0
      }));

      // Sort by count descending
      stats.sort((a, b) => b.assignment_count - a.assignment_count);

      setEmployeeStats(stats);
    } catch (error) {
      console.error('Error loading employee stats:', error);
    }
  };

  const loadAssignmentDetails = async (programId: string) => {
    try {
      // Fetch both teacher and mentor assignments for this program
      const [teacherAssignments, mentorAssignments] = await Promise.all([
        db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, { training_program_id: programId }),
        db.find<MentorTrainingAssignment>(Collections.MENTOR_TRAINING_ASSIGNMENTS, { training_program_id: programId })
      ]);

      console.log('[TrainingProgramManagement] Teacher assignments for program:', programId, teacherAssignments?.length || 0);
      console.log('[TrainingProgramManagement] Mentor assignments for program:', programId, mentorAssignments?.length || 0);

      const hasAssignments = (teacherAssignments && teacherAssignments.length > 0) ||
        (mentorAssignments && mentorAssignments.length > 0);

      if (hasAssignments) {
        // Fetch related data
        const [teachers, mentors, schools, users, schoolAssignments] = await Promise.all([
          db.find<Teacher>(Collections.TEACHERS, {}),
          db.find<Mentor>(Collections.MENTORS, {}),
          db.find<School>(Collections.SCHOOLS, {}),
          db.find<User>(Collections.USERS, {}),
          db.find(Collections.SCHOOL_ASSIGNMENTS, {})
        ]);

        // Build school manager map
        const schoolManagerMap = new Map<string, string>();
        (schoolAssignments as any[]).forEach((sa) => {
          if (sa.school_id && sa.employee_id) {
            schoolManagerMap.set(sa.school_id, sa.employee_id);
          }
        });

        const details: AssignmentDetail[] = [];

        // Process teacher assignments
        teacherAssignments.forEach((assignment) => {
          const teacher = teachers.find(t => t.id === assignment.teacher_id);
          const school = teacher ? schools.find(s => s.id === teacher.school_id) : undefined;
          const assignedBy = users.find(u => u.id === assignment.assigned_by);
          const managerId = teacher?.school_id ? schoolManagerMap.get(teacher.school_id) : undefined;
          const manager = managerId ? users.find(u => u.id === managerId) : undefined;

          details.push({
            assignee_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A',
            assignee_type: 'teacher',
            school_name: school?.name || 'Unassigned',
            assigned_by_name: assignment.assigned_by === 'self' ? 'Self-Enrolled' : (assignedBy?.full_name || 'Unknown'),
            manager_name: manager?.full_name || 'N/A',
            status: assignment.status,
          });
        });

        // Process mentor assignments
        mentorAssignments.forEach((assignment) => {
          const mentor = mentors.find(m => m.id === assignment.mentor_id);
          const school = mentor ? schools.find(s => s.id === mentor.school_id) : undefined;
          const assignedBy = users.find(u => u.id === assignment.assigned_by);
          const managerId = mentor?.school_id ? schoolManagerMap.get(mentor.school_id) : undefined;
          const manager = managerId ? users.find(u => u.id === managerId) : undefined;

          details.push({
            assignee_name: mentor ? `${mentor.first_name} ${mentor.last_name}` : 'N/A',
            assignee_type: 'mentor',
            school_name: school?.name || 'Unassigned',
            assigned_by_name: assignment.assigned_by === 'self' ? 'Self-Enrolled' : (assignedBy?.full_name || 'Unknown'),
            manager_name: manager?.full_name || 'N/A',
            status: assignment.status,
          });
        });

        console.log('[TrainingProgramManagement] Total details (teachers + mentors):', details.length);
        console.log('[TrainingProgramManagement] By type:', {
          teachers: details.filter(d => d.assignee_type === 'teacher').length,
          mentors: details.filter(d => d.assignee_type === 'mentor').length
        });

        setAssignmentDetails(details);
      } else {
        setAssignmentDetails([]);
      }
    } catch (error) {
      console.error('Error loading assignment details:', error);
    }
  };

  const handleViewDetails = async (program: TrainingProgram) => {
    setSelectedProgram(program);
    await loadAssignmentDetails(program.id!);
    setShowDetailsModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const now = new Date().toISOString();
      const data = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        updated_at: now,
      };

      if (editingProgram) {
        await db.updateById(Collections.TRAINING_PROGRAMS, editingProgram.id!, data);
      } else {
        await db.insertOne(Collections.TRAINING_PROGRAMS, {
          ...data,
          created_at: now,
        });
      }

      loadPrograms();
      resetForm();
    } catch (error) {
      console.error('Error saving program:', error);
    }
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    // Simple hardcoded password check
    return password === 'T77';
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async () => {
    setAuthError('');

    const isValid = await verifyPassword(passwordInput);

    if (!isValid) {
      setAuthError('Invalid password. Please try again.');
      return;
    }

    // Password verified, now show confirmation dialog
    setShowPasswordDialog(false);
    setPasswordInput('');

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Training Program',
      message: 'Are you sure you want to delete this training program? This will also delete all associated assignments. This action cannot be undone.',
      onConfirm: async () => {
        try {
          await db.deleteById(Collections.TRAINING_PROGRAMS, pendingDeleteId!);
          setConfirmDialog(null);
          setPendingDeleteId(null);
          loadPrograms();
        } catch (error) {
          console.error('Error deleting program:', error);
        }
      }
    });
  };

  const handleArchiveToggle = async (program: TrainingProgram) => {
    try {
      const newStatus = program.status === 'active' ? 'archived' : 'active';
      await db.updateById(Collections.TRAINING_PROGRAMS, program.id!, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      loadPrograms();
    } catch (error) {
      console.error('Error archiving program:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration_hours: 0,
      category: '',
      target_audience: 'all',
      status: 'active',
      start_date: '',
      end_date: '',
      meeting_link: '',
      enable_marks_card: false,
      marks_configuration: { subjects: [] },
      enable_certificate: false,
      certificate_template_id: '',
      marks_card_template_id: '',
      signature_url: '',
    });
    setSubjectInput({ name: '', max_marks: 100 });
    setEditingProgram(null);
    setShowModal(false);
  };

  const openEditModal = (program: TrainingProgram) => {
    setEditingProgram(program);
    setFormData({
      title: program.title,
      description: program.description,
      duration_hours: program.duration_hours,
      category: program.category,
      target_audience: program.target_audience || 'all',
      status: program.status,
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      meeting_link: program.meeting_link || '',
      enable_marks_card: program.enable_marks_card || false,
      marks_configuration: program.marks_configuration || { subjects: [] },
      enable_certificate: program.enable_certificate || false,
      certificate_template_id: program.certificate_template_id || '',
      marks_card_template_id: program.marks_card_template_id || '',
      signature_url: program.signature_url || '',
    });
    setShowModal(true);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, signature_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addSubject = () => {
    if (subjectInput.name.trim()) {
      setFormData({
        ...formData,
        marks_configuration: {
          subjects: [...formData.marks_configuration.subjects, subjectInput]
        }
      });
      setSubjectInput({ name: '', max_marks: 100 });
    }
  };

  const removeSubject = (index: number) => {
    const newSubjects = [...formData.marks_configuration.subjects];
    newSubjects.splice(index, 1);
    setFormData({
      ...formData,
      marks_configuration: {
        subjects: newSubjects
      }
    });
  };

  const groupByCategory = () => {
    const grouped: Record<string, ProgramWithAssignments[]> = {};
    programs.forEach(program => {
      const cat = program.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(program);
    });
    return grouped;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const groupedPrograms = groupByCategory();

  if (showDesigner) {
    return (
      <TemplateDesigner
        onSave={() => {
          setShowDesigner(false);
          loadPrograms(); // Reload to fetch new templates
          setNotification({ isOpen: true, type: 'success', title: 'Success', message: 'Template saved successfully' });
        }}
        onCancel={() => setShowDesigner(false)}
        initialTemplate={editingTemplate}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Programs</h2>
          <p className="text-gray-600 mt-1">Manage training curriculum and track progress</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <button
                onClick={() => {
                  setEditingTemplate(undefined);
                  setShowDesigner(true);
                }}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LayoutTemplate size={20} />
                Design Template
              </button>
              <button
                onClick={() => {
                  setEditingProgram(null);
                  setFormData({
                    signature_url: '',
                    title: '',
                    description: '',
                    duration_hours: 0,
                    category: '',
                    target_audience: 'all',
                    status: 'active',
                    start_date: '',
                    end_date: '',
                    meeting_link: '',
                    enable_marks_card: false,
                    marks_configuration: { subjects: [] },
                    enable_certificate: false,
                    certificate_template_id: '',
                    marks_card_template_id: '',
                  });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Create Program
              </button>
            </>
          )}
        </div>

      </div>

      <div className="space-y-6">
        {Object.entries(groupedPrograms).map(([category, categoryPrograms]) => {
          // Calculate totals for this category
          const totalTeachers = categoryPrograms.reduce((sum, p) => sum + (p.assignmentCount || 0), 0);
          const totalEmployees = categoryPrograms.reduce((sum, p) => sum + (p.employeeCount || 0), 0);

          return (
            <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                <div className="flex gap-4 items-center text-sm text-gray-600 mt-1">
                  <span>{categoryPrograms.length} {categoryPrograms.length === 1 ? 'program' : 'programs'}</span>
                  {totalTeachers > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={14} className="text-blue-600" />
                      <span className="font-medium text-blue-600">{totalTeachers}</span> teachers
                    </span>
                  )}
                  {totalEmployees > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={14} className="text-green-600" />
                      <span className="font-medium text-green-600">{totalEmployees}</span> employees
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {categoryPrograms.map((program) => (
                  <div key={program.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${program.status === 'active' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                        <BookOpen className={program.status === 'active' ? 'text-blue-600' : 'text-gray-400'} size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{program.title}</h4>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${program.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {program.status}
                          </span>
                          {program.target_audience && program.target_audience !== 'all' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 capitalize">
                              {program.target_audience}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{program.description || 'No description'}</p>

                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Duration:</span> {program.duration_hours} hours
                      </div>
                      <div className="flex items-center gap-2 py-1">
                        <Users size={16} className="text-blue-600" />
                        <span className="font-medium text-blue-600">{program.assignmentCount}</span>
                        <span className="text-gray-600">teacher{program.assignmentCount !== 1 ? 's' : ''} assigned</span>
                      </div>
                      {program.employeeCount > 0 && (
                        <div className="flex items-center gap-2 py-1">
                          <Users size={16} className="text-green-600" />
                          <span className="font-medium text-green-600">{program.employeeCount}</span>
                          <span className="text-gray-600">employee{program.employeeCount !== 1 ? 's' : ''} assigned teachers</span>
                        </div>
                      )}
                      {program.start_date && program.end_date && (
                        <div>
                          <span className="font-medium">Dates:</span> {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                        </div>
                      )}
                      {program.meeting_link && (
                        <div className="mt-2">
                          <a
                            href={program.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs underline break-all"
                          >
                            Join Meeting
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      {canAssign && onNavigateToAssignments && (
                        <>
                          {(program.target_audience === 'teachers' || program.target_audience === 'all' || !program.target_audience) && (
                            <button
                              onClick={() => {
                                // Store program ID in sessionStorage for TrainingAssignmentManagement
                                sessionStorage.setItem('selectedProgramId', program.id!);
                                sessionStorage.setItem('selectedRole', 'teacher');
                                onNavigateToAssignments();
                              }}
                              className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded text-sm transition-colors font-medium"
                              title="Assign this training to teachers"
                            >
                              <UserPlus size={14} />
                              Teachers
                            </button>
                          )}
                          {(program.target_audience === 'mentors' || program.target_audience === 'all' || !program.target_audience) && (
                            <button
                              onClick={() => {
                                // Store program ID in sessionStorage for TrainingAssignmentManagement
                                sessionStorage.setItem('selectedProgramId', program.id!);
                                sessionStorage.setItem('selectedRole', 'mentor');
                                onNavigateToAssignments();
                              }}
                              className="flex-1 flex items-center justify-center gap-1 text-purple-600 hover:bg-purple-50 px-2 py-1.5 rounded text-sm transition-colors font-medium"
                              title="Assign this training to mentors"
                            >
                              <Award size={14} />
                              Mentors
                            </button>
                          )}
                        </>
                      )}
                      {program.assignmentCount > 0 && (
                        <button
                          onClick={() => handleViewDetails(program)}
                          className="flex-1 flex items-center justify-center gap-1 text-green-600 hover:bg-green-50 px-2 py-1.5 rounded text-sm transition-colors"
                        >
                          <Eye size={14} />
                          Details
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button
                            onClick={() => openEditModal(program)}
                            className="flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-50 px-2 py-1.5 rounded text-sm transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(program)}
                            className="flex items-center justify-center gap-1 text-orange-600 hover:bg-orange-50 px-2 py-1.5 rounded text-sm transition-colors"
                          >
                            <Archive size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(program.id!)}
                            className="flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1.5 rounded text-sm transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {
        isAdmin && employeeStats.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users size={20} />
                Employee Assignment Statistics
              </h3>
              <p className="text-sm text-blue-100 mt-1">Teachers assigned to training programs by each employee</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teachers Assigned
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employeeStats.map((stat, index) => (
                    <tr key={stat.employee_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{stat.employee_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-blue-600">{stat.assignment_count}</span>
                          <span className="text-sm text-gray-500">teacher{stat.assignment_count !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      {
        programs.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No training programs found. Add your first program to get started.</p>
          </div>
        )
      }

      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">{editingProgram ? 'Edit Training Program' : 'Add New Training Program'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                    <select
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Audiences</option>
                      <option value="teachers">Teachers</option>
                      <option value="mentors">Mentors</option>
                      <option value="management">Management</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                  <input
                    type="url"
                    value={formData.meeting_link}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Provide a meeting link for virtual training sessions</p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Completion & Assessment</h4>

                  <div className="space-y-4">
                    {/* Certificate Configuration */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          id="enable_certificate"
                          checked={formData.enable_certificate}
                          onChange={(e) => setFormData({ ...formData, enable_certificate: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="enable_certificate" className="text-sm font-medium text-gray-700">Enable Certificate</label>
                      </div>

                      {formData.enable_certificate && (
                        <div className="ml-6">
                          <label className="block text-xs text-gray-500 mb-1">Select Certificate Template</label>
                          <select
                            value={formData.certificate_template_id || ''}
                            onChange={(e) => setFormData({ ...formData, certificate_template_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">-- Default / None --</option>
                            {templates.filter(t => t.type === 'certificate').map(t => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-400 mt-1">Select a custom design or leave empty for default.</p>

                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Signature Image</label>
                            <div className="flex items-center gap-4">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="block w-full text-sm text-gray-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-blue-50 file:text-blue-700
                                  hover:file:bg-blue-100"
                              />
                              {formData.signature_url && (
                                <div className="relative w-20 h-10 border border-gray-200 rounded p-1">
                                  <img src={formData.signature_url} alt="Signature Preview" className="w-full h-full object-contain" />
                                  <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, signature_url: '' })}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                                    title="Remove Signature"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Upload a PNG image of the authorized signature to be displayed on the certificate.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Marks Card Configuration */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          id="enable_marks_card"
                          checked={formData.enable_marks_card}
                          onChange={(e) => setFormData({ ...formData, enable_marks_card: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="enable_marks_card" className="text-sm font-medium text-gray-700">Enable Marks Card</label>
                      </div>

                      {formData.enable_marks_card && (
                        <div className="ml-6 space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Select Marks Card Template</label>
                            <select
                              value={formData.marks_card_template_id || ''}
                              onChange={(e) => setFormData({ ...formData, marks_card_template_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="">-- Default / None --</option>
                              {templates.filter(t => t.type === 'marks_card').map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Marks Card Subjects</h5>

                            <div className="space-y-2 mb-3">
                              {formData.marks_configuration.subjects.map((subject, index) => (
                                <div key={index} className="flex items-center gap-2 bg-white p-2 border border-gray-200 rounded">
                                  <span className="flex-1 text-sm font-medium">{subject.name}</span>
                                  <span className="text-sm text-gray-500">Max: {subject.max_marks}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeSubject(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                              {formData.marks_configuration.subjects.length === 0 && (
                                <p className="text-xs text-gray-500 italic">No subjects added.</p>
                              )}
                            </div>

                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-600 mb-1">Subject Name</label>
                                <input
                                  type="text"
                                  value={subjectInput.name}
                                  onChange={(e) => setSubjectInput({ ...subjectInput, name: e.target.value })}
                                  placeholder="e.g. Theory"
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div className="w-24">
                                <label className="block text-xs text-gray-600 mb-1">Max Marks</label>
                                <input
                                  type="number"
                                  value={subjectInput.max_marks}
                                  onChange={(e) => setSubjectInput({ ...subjectInput, max_marks: parseInt(e.target.value) || 0 })}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={addSubject}
                                disabled={!subjectInput.name.trim()}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                    {editingProgram ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div >
          </div >
        )
      }

      {
        showDetailsModal && selectedProgram && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedProgram.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">Assigned Teachers and Details</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              {/* Assigned By / Manager Filter */}
              {assignmentDetails.length > 0 && (() => {
                // Get unique names from both assigned_by_name and manager_name
                const allNames = new Set<string>();
                assignmentDetails.forEach(d => {
                  if (d.assigned_by_name && d.assigned_by_name !== 'Unknown') allNames.add(d.assigned_by_name);
                  if (d.manager_name && d.manager_name !== 'N/A') allNames.add(d.manager_name);
                });
                return (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Assigned By / Manager</label>
                    <select
                      value={detailsAssignerFilter}
                      onChange={(e) => setDetailsAssignerFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">All</option>
                      {[...allNames].sort().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {assignmentDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignmentDetails
                        .filter(detail => detailsAssignerFilter === 'all' || detail.assigned_by_name === detailsAssignerFilter || detail.manager_name === detailsAssignerFilter)
                        .map((detail, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {detail.assignee_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${detail.assignee_type === 'mentor' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                {detail.assignee_type === 'mentor' ? 'Mentor' : 'Teacher'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {detail.school_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {detail.assigned_by_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {detail.manager_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${detail.status === 'completed' ? 'bg-green-100 text-green-800' :
                                detail.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  detail.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {detail.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No teachers or mentors assigned to this program yet.
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showPasswordDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-4">
                To delete this training program, please enter your admin password:
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && passwordInput) handlePasswordSubmit();
                  }}
                />
                {authError && (
                  <p className="text-red-600 text-sm mt-1">{authError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordInput('');
                    setAuthError('');
                    setPendingDeleteId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!passwordInput}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Verify & Continue
                </button>
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
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
            type="danger"
          />
        )
      }
    </div >
  );
}
