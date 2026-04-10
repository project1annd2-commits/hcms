import { db } from '../../lib/services/db';
import { Collections } from '../../lib/constants';
import { AssignmentWithDetails, TrainingProgram, User, Teacher, Mentor } from '../../lib/models';
import { AssignmentFormData, BulkAssignFormData, BulkAttendanceFormData } from './TrainingAssignmentUtils';

export interface HandlerDeps {
  role: 'teacher' | 'mentor';
  currentUser: User;
  programs: TrainingProgram[];
  assignments: AssignmentWithDetails[];
  teachers: (Teacher & { school?: any })[];
  mentors: (Mentor & { school?: any })[];
  setLoading: (v: boolean) => void;
  loadData: () => Promise<void>;
  setNotification: (n: any) => void;
}

export const useAssignmentHandlers = (
  deps: HandlerDeps,
  formData: AssignmentFormData,
  setFormData: (d: AssignmentFormData) => void,
  editingAssignment: AssignmentWithDetails | null,
  setShowModal: (v: boolean) => void,
  setEditingAssignment: (a: AssignmentWithDetails | null) => void,
  setConfirmDialog: (d: any) => void
) => {
  const { role, currentUser, programs, setLoading, loadData, setNotification } = deps;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedProgram = programs.find(p => p.id === formData.training_program_id);
      const scoreValue = formData.score ? parseFloat(formData.score) : null;

      let scoreToSave: number | null = scoreValue;

      if (selectedProgram?.enable_marks_card && selectedProgram.marks_configuration?.subjects?.length) {
        let totalObtained = 0;
        let totalMax = 0;
        selectedProgram.marks_configuration?.subjects?.forEach((sub: any) => {
          totalObtained += formData.marks_data[sub.name] || 0;
          totalMax += sub.max_marks;
        });
        if (totalMax > 0) {
          scoreToSave = Math.round((totalObtained / totalMax) * 100);
        }
      }

      const dataToSave: any = {
        training_program_id: formData.training_program_id,
        due_date: formData.due_date || null,
        status: formData.status,
        progress_percentage: formData.progress_percentage,
        completion_date: formData.completion_date || null,
        score: scoreToSave,
        marks_data: formData.marks_data,
        assigned_by: currentUser.id,
        assigned_date: editingAssignment?.assigned_date || new Date().toISOString()
      };

      if (role === 'teacher') {
        dataToSave.teacher_id = formData.teacher_id;
      } else {
        dataToSave.mentor_id = formData.mentor_id;
      }

      if (editingAssignment?.id) {
        await db.updateById(
          role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS,
          editingAssignment.id,
          dataToSave
        );
      } else {
        dataToSave.assigned_date = new Date().toISOString();
        dataToSave.is_teacher = role === 'teacher';
        await db.insertOne(
          role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS,
          dataToSave
        );
      }

      setShowModal(false);
      setEditingAssignment(null);
      setFormData({
        training_program_id: '',
        teacher_id: '',
        mentor_id: '',
        due_date: '',
        status: 'assigned',
        progress_percentage: 0,
        completion_date: '',
        score: '',
        marks_data: {}
      });

      await loadData();
      setNotification({
        isOpen: true,
        type: 'success',
        title: editingAssignment ? 'Assignment Updated' : 'Assignment Created',
        message: `Training assignment has been ${editingAssignment ? 'updated' : 'created'} successfully.`
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save assignment. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this training assignment? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        try {
          await db.deleteById(
            role === 'teacher' ? Collections.TRAINING_ASSIGNMENTS : Collections.MENTOR_TRAINING_ASSIGNMENTS,
            id
          );
          await loadData();
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Deleted',
            message: 'Training assignment has been deleted.'
          });
        } catch (error) {
          console.error('Error deleting assignment:', error);
          setNotification({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'Failed to delete assignment.'
          });
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleBulkAssign = async (bulkAssignForm: BulkAssignFormData) => {
    setLoading(true);
    try {
      const { training_program_id, due_date, school_id } = bulkAssignForm;
      const program = programs.find(p => p.id === training_program_id);

      if (!program) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: 'Invalid training program selected.'
        });
        return;
      }

      const userList = role === 'teacher' ? deps.teachers : [...deps.mentors, ...deps.teachers];
      const filteredUsers = school_id === 'all'
        ? userList
        : userList.filter((u: any) => u.school_id === school_id);

      const existingAssignments = deps.assignments.filter(
        a => a.training_program_id === training_program_id
      );
      const existingUserIds = new Set(
        role === 'teacher'
          ? existingAssignments.map(a => a.teacher_id)
          : existingAssignments.map(a => a.mentor_id)
      );

      const usersToAssign = filteredUsers.filter(
        (u: any) => u.status === 'active' && !existingUserIds.has(u.id)
      );

      if (usersToAssign.length === 0) {
        setNotification({
          isOpen: true,
          type: 'info',
          title: 'No New Assignments',
          message: 'All selected users are already assigned to this program.'
        });
        setLoading(false);
        return;
      }

      const assignmentsToCreate = usersToAssign.map((user: any) => ({
        training_program_id,
        [role === 'teacher' ? 'teacher_id' : 'mentor_id']: user.id,
        due_date: due_date || null,
        status: 'assigned',
        progress_percentage: 0,
        assigned_by: currentUser.id,
        assigned_date: new Date().toISOString(),
        is_teacher: role === 'teacher'
      }));

      const collection = role === 'teacher'
        ? Collections.TRAINING_ASSIGNMENTS
        : Collections.MENTOR_TRAINING_ASSIGNMENTS;

      for (const assignment of assignmentsToCreate) {
        await db.insertOne(collection, assignment);
      }

      await loadData();
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Bulk Assignment Complete',
        message: `Successfully assigned ${assignmentsToCreate.length} ${role === 'teacher' ? 'teachers' : 'mentors'} to ${program.title}.`
      });
    } catch (error) {
      console.error('Error in bulk assign:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to complete bulk assignment.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAttendanceSubmit = async (
    bulkAttendanceForm: BulkAttendanceFormData,
    bulkAttendanceData: Record<string, boolean>,
    selectedProgram: TrainingProgram
  ) => {
    setLoading(true);
    try {
      const selectedIds = Object.keys(bulkAttendanceData).filter(id => bulkAttendanceData[id]);

      if (selectedIds.length === 0) {
        setNotification({
          isOpen: true,
          type: 'info',
          title: 'No Selection',
          message: 'Please select at least one trainee.'
        });
        return;
      }

      const attendanceCollection = role === 'teacher'
        ? Collections.TRAINING_ATTENDANCE
        : Collections.MENTOR_TRAINING_ATTENDANCE;

      const userIdField = role === 'teacher' ? 'teacher_id' : 'mentor_id';

      for (const assignmentId of selectedIds) {
        const assignment = deps.assignments.find(a => a.id === assignmentId);
        if (!assignment) continue;

        const userId = role === 'teacher' ? assignment.teacher_id : assignment.mentor_id;

        await db.insertOne(attendanceCollection, {
          training_assignment_id: assignmentId,
          training_program_id: selectedProgram.id,
          [userIdField]: userId,
          attendance_date: bulkAttendanceForm.attendance_date,
          status: bulkAttendanceForm.status,
          notes: bulkAttendanceForm.notes || '',
          recorded_by: currentUser.id,
          recorded_at: new Date().toISOString()
        });
      }

      await loadData();
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Attendance Recorded',
        message: `Attendance recorded for ${selectedIds.length} ${role === 'teacher' ? 'teachers' : 'mentors'}.`
      });
    } catch (error) {
      console.error('Error recording bulk attendance:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to record attendance.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMarksSave = async (
    bulkMarksData: Record<string, Record<string, number>>,
    bulkMarksProgram: TrainingProgram | null
  ) => {
    if (!bulkMarksProgram) return;
    setLoading(true);

    try {
      const assignmentIds = Object.keys(bulkMarksData);
      const collection = role === 'teacher'
        ? Collections.TRAINING_ASSIGNMENTS
        : Collections.MENTOR_TRAINING_ASSIGNMENTS;

      for (const assignmentId of assignmentIds) {
        const marksData = bulkMarksData[assignmentId];
        const assignment = deps.assignments.find(a => a.id === assignmentId);

        if (!assignment || !marksData || Object.keys(marksData).length === 0) continue;

        let totalObtained = 0;
        let totalMax = 0;
        bulkMarksProgram.marks_configuration?.subjects?.forEach((sub: any) => {
          totalObtained += marksData[sub.name] || 0;
          totalMax += sub.max_marks;
        });

        const calculatedScore = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

        await db.updateById(collection, assignmentId, {
          marks_data: marksData,
          score: calculatedScore
        });
      }

      await loadData();
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Marks Saved',
        message: 'Marks have been saved successfully.'
      });
    } catch (error) {
      console.error('Error saving marks:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save marks.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPublishMarks = async (
    bulkMarksData: Record<string, Record<string, number>>,
    bulkMarksProgram: TrainingProgram | null
  ) => {
    if (!bulkMarksProgram) return;
    setLoading(true);

    try {
      const collection = role === 'teacher'
        ? Collections.TRAINING_ASSIGNMENTS
        : Collections.MENTOR_TRAINING_ASSIGNMENTS;

      const assignmentIds = Object.keys(bulkMarksData);

      for (const assignmentId of assignmentIds) {
        const marksData = bulkMarksData[assignmentId];

        if (!marksData || Object.keys(marksData).length === 0) continue;

        let totalObtained = 0;
        let totalMax = 0;
        bulkMarksProgram.marks_configuration?.subjects?.forEach((sub: any) => {
          totalObtained += marksData[sub.name] || 0;
          totalMax += sub.max_marks;
        });

        const calculatedScore = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

        await db.updateById(collection, assignmentId, {
          marks_data: marksData,
          score: calculatedScore,
          marks_published: true
        });
      }

      await loadData();
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Marks Published',
        message: 'All marks have been published successfully.'
      });
    } catch (error) {
      console.error('Error publishing marks:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to publish marks.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId: string) => {
    setLoading(true);
    try {
      const collection = role === 'teacher'
        ? Collections.TRAINING_ATTENDANCE
        : Collections.MENTOR_TRAINING_ATTENDANCE;

      await db.deleteById(collection, attendanceId);
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Deleted',
        message: 'Attendance record deleted.'
      });
    } catch (error) {
      console.error('Error deleting attendance:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete attendance record.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async (assignment: AssignmentWithDetails) => {
    const collection = role === 'teacher'
      ? Collections.TRAINING_ASSIGNMENTS
      : Collections.MENTOR_TRAINING_ASSIGNMENTS;

    await db.updateById(collection, assignment.id!, {
      certificate_issued: true,
      certificate_issued_date: new Date().toISOString()
    });
    await loadData();
  };

  const handlePublishMarks = async (assignment: AssignmentWithDetails) => {
    const collection = role === 'teacher'
      ? Collections.TRAINING_ASSIGNMENTS
      : Collections.MENTOR_TRAINING_ASSIGNMENTS;

    await db.updateById(collection, assignment.id!, {
      marks_published: !assignment.marks_published
    });
    await loadData();
  };

  return {
    handleSubmit,
    handleDelete,
    handleBulkAssign,
    handleBulkAttendanceSubmit,
    handleBulkMarksSave,
    handleBulkPublishMarks,
    handleDeleteAttendance,
    handleGenerateCertificate,
    handlePublishMarks
  };
};
