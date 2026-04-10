import React, { useState, useEffect } from 'react';
import { Teacher, School, Permission, TrainingAssignment, TrainingProgram, TrainingAttendance, User } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, GraduationCap, Eye, BookOpen, Search, Building2, Download } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import ProfessionalTeacherProfile from './ProfessionalTeacherProfile';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type TeacherWithSchool = Teacher & {
  school?: School;
  training_programs?: string[];
};

type AssignmentWithDetails = TrainingAssignment & {
  training_program?: TrainingProgram;
};

export default function TeacherManagement({ currentUser, currentPermissions }: Props) {
  const [teachers, setTeachers] = useState<TeacherWithSchool[]>([]); // "My" teachers
  const [allGlobalTeachers, setAllGlobalTeachers] = useState<TeacherWithSchool[]>([]); // ALL teachers (for search)
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherWithSchool[]>([]);
  const [unassignedTeachers, setUnassignedTeachers] = useState<TeacherWithSchool[]>([]);
  const [filteredUnassignedTeachers, setFilteredUnassignedTeachers] = useState<TeacherWithSchool[]>([]);
  const [alumniTeachers, setAlumniTeachers] = useState<TeacherWithSchool[]>([]);
  const [filteredAlumniTeachers, setFilteredAlumniTeachers] = useState<TeacherWithSchool[]>([]);
  const [schools, setSchools] = useState<School[]>([]); // "My" schools
  const [allSchoolsGlobal, setAllSchoolsGlobal] = useState<School[]>([]); // ALL schools (for lookup)
  const [mySchoolIds, setMySchoolIds] = useState<string[]>([]); // IDs of schools I manage
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('');
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [nameSearch, setNameSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'school' | 'unassigned' | 'alumni'>('school');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithSchool | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<AssignmentWithDetails[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TrainingAttendance[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    training_program_id: '',
    due_date: '',
  });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    school_id: '',
    subject_specialization: '',
    qualification: '',
    hire_date: '',
    status: 'active' as 'active' | 'on_leave' | 'inactive',
    is_alumni: false,
    plain_passcode: '',
    // New HR Fields
    employee_id: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    date_of_birth: '',
    blood_group: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    photo_url: '',
  });

  const canManage = currentPermissions.can_manage_teachers || currentUser.role === 'employee';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // If searching by phone, search GLOBAL list. Otherwise search MY list.
    let sourceList: TeacherWithSchool[] = teachers;

    if (phoneSearch.trim()) {
      sourceList = allGlobalTeachers;
    }

    let filtered = sourceList;
    let filteredUnassigned = unassignedTeachers;

    // Apply Phone Search
    if (phoneSearch.trim()) {
      const term = phoneSearch.trim().replace(/\s+/g, '');
      filtered = filtered.filter(t => t.phone?.replace(/\s+/g, '').includes(term));
      filteredUnassigned = unassignedTeachers.filter(t => t.phone?.replace(/\s+/g, '').includes(term));
    }

    // Apply Name Search
    if (nameSearch.trim()) {
      const term = nameSearch.trim().toLowerCase();
      filtered = filtered.filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(term) ||
        t.first_name.toLowerCase().includes(term) ||
        t.last_name.toLowerCase().includes(term)
      );
      filteredUnassigned = filteredUnassigned.filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(term) ||
        t.first_name.toLowerCase().includes(term) ||
        t.last_name.toLowerCase().includes(term)
      );
    }

    // Apply School Filter
    if (selectedSchoolFilter) {
      filtered = filtered.filter(t => t.school_id === selectedSchoolFilter);
    }

    setFilteredTeachers(filtered);
    setFilteredUnassignedTeachers(filteredUnassigned);

    // Alumni Search
    let filteredAlumni = alumniTeachers;
    if (phoneSearch.trim()) {
      const term = phoneSearch.trim().replace(/\s+/g, '');
      filteredAlumni = alumniTeachers.filter(t => t.phone?.replace(/\s+/g, '').includes(term));
    }
    if (nameSearch.trim()) {
      const term = nameSearch.trim().toLowerCase();
      filteredAlumni = filteredAlumni.filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(term) ||
        t.first_name.toLowerCase().includes(term) ||
        t.last_name.toLowerCase().includes(term)
      );
    }
    setFilteredAlumniTeachers(filteredAlumni);
  }, [selectedSchoolFilter, phoneSearch, nameSearch, teachers, unassignedTeachers, allGlobalTeachers, alumniTeachers]);

  const loadData = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];

      // 1. Get Assigned Schools
      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
      }
      setMySchoolIds(assignedSchoolIds);

      // 2. Fetch ALL Schools (needed for global lookup mapping)
      const allSchoolsData = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
      setAllSchoolsGlobal(allSchoolsData);

      // 3. Set "My Schools" for filter dropdown
      let mySchoolsData: School[] = [];
      if (currentUser.role === 'admin') {
        mySchoolsData = allSchoolsData;
      } else {
        mySchoolsData = allSchoolsData.filter(s => s.id && assignedSchoolIds.includes(s.id));
      }
      setSchools(mySchoolsData);

      // 4. Load ALL teachers (Global)
      const allTeachersData = await db.find<Teacher>(Collections.TEACHERS, {}, { sort: { last_name: 1 } });

      // 5. Load training assignments (needed for mapping programs)
      const assignmentsData = await db.find(Collections.TRAINING_ASSIGNMENTS, {});
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
      setPrograms(allPrograms);

      // 6. Map ALL teachers with school details and training programs
      const mappedAllTeachers = allTeachersData.map(t => {
        const teacherPrograms = assignmentsData
          .filter((a: any) => a.teacher_id === t.id)
          .map((a: any) => allPrograms.find(p => p.id === a.training_program_id)?.title)
          .filter(Boolean) as string[];

        return {
          ...t,
          school: allSchoolsData.find(s => s.id === t.school_id),
          training_programs: teacherPrograms
        };
      });
      setAllGlobalTeachers(mappedAllTeachers);

      // 7. Get non-alumni teachers
      const nonAlumniTeachers = mappedAllTeachers.filter(t => !t.is_alumni);

      // 8. Define "My Teachers" (non-alumni)
      let myTeachersData: TeacherWithSchool[] = [];
      if (currentUser.role === 'admin') {
        myTeachersData = nonAlumniTeachers.filter(t => t.school_id);
      } else {
        myTeachersData = nonAlumniTeachers.filter(t => t.school_id && assignedSchoolIds.includes(t.school_id));
      }
      setTeachers(myTeachersData);
      setFilteredTeachers(myTeachersData);

      // 9. Unassigned Teachers (non-alumni)
      const mappedUnassigned = nonAlumniTeachers.filter(t => !t.school_id);
      setUnassignedTeachers(mappedUnassigned);
      setFilteredUnassignedTeachers(mappedUnassigned);

      // 10. Alumni Teachers
      let alumniData: TeacherWithSchool[] = [];
      const allAlumniMapped = mappedAllTeachers.filter(t => t.is_alumni);

      if (currentUser.role === 'admin') {
        alumniData = allAlumniMapped;
      } else {
        // Employees see alumni from their assigned schools OR unassigned alumni
        alumniData = allAlumniMapped.filter(t =>
          !t.school_id || assignedSchoolIds.includes(t.school_id)
        );
      }

      setAlumniTeachers(alumniData);
      setFilteredAlumniTeachers(alumniData);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      school_id: formData.school_id || null,
      hire_date: formData.hire_date || null,
      gender: formData.gender || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      blood_group: formData.blood_group || undefined,
      address: formData.address || undefined,
      employee_id: formData.employee_id || undefined,
      photo_url: formData.photo_url || undefined,
      emergency_contact: {
        name: formData.emergency_contact_name || undefined,
        relationship: formData.emergency_contact_relationship || undefined,
        phone: formData.emergency_contact_phone || undefined,
      },
    };

    try {
      if (editingTeacher && editingTeacher.id) {
        await db.updateById<Teacher>(Collections.TEACHERS, editingTeacher.id, data);
      } else {
        await db.insertOne<Teacher>(Collections.TEACHERS, {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }

      loadData();
      resetForm();
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      alert('Failed to save teacher: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Teacher',
      message: 'Are you sure you want to deactivate this teacher? They will no longer appear in active lists, but their history (like chats and reports) will be preserved.',
      onConfirm: async () => {
        await db.updateById(Collections.TEACHERS, id, { 
          status: 'inactive',
          updated_at: new Date().toISOString()
        });
        setConfirmDialog(null);
        loadData();
      }
    });
  };

  const handleToggleAlumni = async (teacher: Teacher) => {
    if (!teacher.id) return;
    const newAlumniStatus = !teacher.is_alumni;
    const action = newAlumniStatus ? 'mark as alumni' : 'remove from alumni status';

    if (!confirm(`Are you sure you want to ${action} ${teacher.first_name} ${teacher.last_name}?`)) return;

    try {
      await db.updateById(Collections.TEACHERS, teacher.id, {
        is_alumni: newAlumniStatus,
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error: any) {
      console.error('Error toggling alumni status:', error);
      alert('Failed to update alumni status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      school_id: '',
      subject_specialization: '',
      qualification: '',
      hire_date: '',
      status: 'active',
      is_alumni: false,
      plain_passcode: '',
      employee_id: '',
      gender: '',
      date_of_birth: '',
      blood_group: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_relationship: '',
      emergency_contact_phone: '',
      photo_url: '',
    });
    setEditingTeacher(null);
    setShowModal(false);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone,
      school_id: teacher.school_id || '',
      subject_specialization: teacher.subject_specialization,
      qualification: teacher.qualification || '',
      hire_date: teacher.hire_date || '',
      status: teacher.status,
      is_alumni: teacher.is_alumni || false,
      plain_passcode: teacher.plain_passcode || '',
      employee_id: teacher.employee_id || '',
      gender: teacher.gender || '',
      date_of_birth: teacher.date_of_birth || '',
      blood_group: teacher.blood_group || '',
      address: teacher.address || '',
      emergency_contact_name: teacher.emergency_contact?.name || '',
      emergency_contact_relationship: teacher.emergency_contact?.relationship || '',
      emergency_contact_phone: teacher.emergency_contact?.phone || '',
      photo_url: teacher.photo_url || '',
    });
    setShowModal(true);
  };

  const openAssignModal = (teacher: TeacherWithSchool) => {
    setSelectedTeacher(teacher);
    setAssignForm({
      training_program_id: '',
      due_date: '',
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !assignForm.training_program_id) return;

    try {
      await db.insertOne(Collections.TRAINING_ASSIGNMENTS, {
        teacher_id: selectedTeacher.id,
        training_program_id: assignForm.training_program_id,
        due_date: assignForm.due_date || null,
        status: 'assigned',
        progress_percentage: 0,
        assigned_by: currentUser.id,
        assigned_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      alert('Teacher has been successfully assigned to training');
      setShowAssignModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error assigning training:', error);
      alert('Failed to assign training: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openProfileModal = async (teacher: TeacherWithSchool) => {
    setSelectedTeacher(teacher);

    try {
      const [assignments, attendance] = await Promise.all([
        db.find(Collections.TRAINING_ASSIGNMENTS, { teacher_id: teacher.id }, { sort: { assigned_date: -1 } }),
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, { teacher_id: teacher.id }).then(records =>
          records.sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
        )
      ]);

      // Load training programs for assignments
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});

      const mappedAssignments = assignments.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      // Load programs for attendance
      const mappedAttendance = attendance.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      setTeacherAssignments(mappedAssignments);
      setTeacherAttendance(mappedAttendance);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error loading teacher profile:', error);
    }
  };

  // Helper to determine if current user owns a teacher
  const isMyTeacher = (teacher: TeacherWithSchool) => {
    if (currentUser.role === 'admin') return true;
    if (!teacher.school_id) return true; // Treat unassigned as viewable/claimable
    return mySchoolIds.includes(teacher.school_id);
  };

  // Helper to get schools list for display (Dynamic based on search results)
  const getSchoolsForDisplay = () => {
    if (phoneSearch.trim()) {
      // If searching, we want headers for ALL schools found
      const schoolIds = Array.from(new Set(filteredTeachers.map(t => t.school_id).filter(Boolean) as string[]));
      return allSchoolsGlobal.filter(s => s.id && schoolIds.includes(s.id));
    }
    return schools; // Otherwise show just my schools
  };

  const handleExportCSV = () => {
    // We use allGlobalTeachers as it contains teachers from all schools already mapped
    const headers = ['Teacher Name', 'Phone Number', 'School Name', 'Login Password', 'Status', 'Qualification'];
    const csvData = allGlobalTeachers.map(t => [
      `"${t.first_name} ${t.last_name}"`,
      `"${t.phone || 'N/A'}"`,
      `"${t.school?.name || 'Unassigned'}"`,
      `"${t.plain_passcode || 'Not Set'}"`,
      `"${t.status}"`,
      `"${t.qualification || 'N/A'}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `HCMS_Teachers_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const schoolsToRender = getSchoolsForDisplay();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Teacher Management</h2>
          <p className="text-gray-600 mt-1">Manage teacher profiles and assignments</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by name..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-48"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by phone (Global)..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-48"
            />
          </div>
          <select
            value={selectedSchoolFilter}
            onChange={(e) => setSelectedSchoolFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          {currentUser.role === 'admin' && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              title="Export all teachers list to CSV"
            >
              <Download size={20} />
              Export CSV
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Teacher
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('school')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'school'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            School Teachers
            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
              {teachers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'unassigned'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Unassigned Teachers
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${unassignedTeachers.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
              }`}>
              {unassignedTeachers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('alumni')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'alumni'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Alumni Teachers
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${alumniTeachers.length > 0 ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
              }`}>
              {alumniTeachers.length}
            </span>
          </button>
        </nav>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {activeTab === 'school' ? (
            <>
              Showing <span className="font-semibold text-gray-900">{filteredTeachers.length}</span> of <span className="font-semibold text-gray-900">{teachers.length}</span> school teachers
            </>
          ) : activeTab === 'unassigned' ? (
            <>
              Showing <span className="font-semibold text-gray-900">{filteredUnassignedTeachers.length}</span> of <span className="font-semibold text-gray-900">{unassignedTeachers.length}</span> unassigned teachers
            </>
          ) : (
            <>
              Showing <span className="font-semibold text-gray-900">{filteredAlumniTeachers.length}</span> of <span className="font-semibold text-gray-900">{alumniTeachers.length}</span> alumni teachers
            </>
          )}
          {(selectedSchoolFilter || phoneSearch || nameSearch) && (
            <span className="ml-2 text-blue-600">
              (
              {selectedSchoolFilter && `school: ${allSchoolsGlobal.find(s => s.id === selectedSchoolFilter)?.name}`}
              {phoneSearch && `${selectedSchoolFilter ? ', ' : ''}phone: "${phoneSearch}"`}
              {nameSearch && `${(selectedSchoolFilter || phoneSearch) ? ', ' : ''}name: "${nameSearch}"`}
              )
            </span>
          )}
        </p>
        {(selectedSchoolFilter || phoneSearch || nameSearch) && (
          <button
            onClick={() => {
              setSelectedSchoolFilter('');
              setPhoneSearch('');
              setNameSearch('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* School Teachers Table - Grouped by School */}
      {activeTab === 'school' && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schoolsToRender
                  .filter(school => {
                    // Only show schools that have teachers in the current filtered list
                    // Or if a specific school is selected via filter
                    if (selectedSchoolFilter && school.id !== selectedSchoolFilter) return false;
                    return filteredTeachers.some(t => t.school_id === school.id);
                  })
                  .map(school => {
                    const schoolTeachers = filteredTeachers.filter(t => t.school_id === school.id);
                    if (schoolTeachers.length === 0) return null;

                    const isAssignedSchool = currentUser.role === 'admin' || mySchoolIds.includes(school.id || '');

                    return (
                      <React.Fragment key={school.id}>
                        {/* School Header Row */}
                        <tr className={`${isAssignedSchool ? 'bg-blue-50/50' : 'bg-gray-50/80'} `}>
                          <td colSpan={5} className={`px-6 py-3 border-t border-b ${isAssignedSchool ? 'border-blue-100' : 'border-gray-200'} `}>
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className={isAssignedSchool ? "text-blue-600" : "text-gray-500"} />
                              <span className={`font-bold text-sm ${isAssignedSchool ? 'text-gray-800' : 'text-gray-600'}`}>
                                {school.name}
                              </span>
                              {!isAssignedSchool && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-2">External School</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAssignedSchool ? 'text-blue-600 bg-blue-100' : 'text-gray-600 bg-gray-100'}`}>
                                {schoolTeachers.length} Teachers
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Teacher Rows */}
                        {schoolTeachers.map((teacher) => {
                          const isOwnTeacher = isMyTeacher(teacher);
                          return (
                            <tr key={teacher.id} className={`hover:bg-gray-50 ${!isOwnTeacher ? 'bg-gray-50/30' : ''}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isOwnTeacher ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <GraduationCap className={isOwnTeacher ? "text-blue-600" : "text-gray-400"} size={20} />
                                  </div>
                                  <div className="ml-4">
                                    <div className="flex items-center gap-2">
                                      <div className={`text-sm font-medium ${isOwnTeacher ? 'text-gray-900' : 'text-gray-600'}`}>{teacher.first_name} {teacher.last_name}</div>
                                      {teacher.training_programs && teacher.training_programs.length > 0 && (
                                        <div className="flex gap-1">
                                          {teacher.training_programs.map((program, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                                              title={`Assigned to ${program}`}
                                            >
                                              {program.includes('C.10') ? 'C.10' : program.substring(0, 8)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{teacher.email}</div>
                                  </div>
                                </div>
                              </td>
                              {/* Removed School Column as it's now a header */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{teacher.subject_specialization || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{teacher.phone || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                                  {teacher.plain_passcode || 'Not Set'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(teacher.status)}`}>
                                  {teacher.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openProfileModal(teacher)}
                                    className="text-purple-600 hover:text-purple-900"
                                    title="View Profile & Trainings"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  {canManage && isOwnTeacher && (
                                    <>
                                      <button
                                        onClick={() => openAssignModal(teacher)}
                                        className="text-orange-600 hover:text-orange-900"
                                        title="Assign Training"
                                      >
                                        <BookOpen size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleToggleAlumni(teacher)}
                                        className="text-purple-600 hover:text-purple-900"
                                        title="Mark as Alumni"
                                      >
                                        <GraduationCap size={18} />
                                      </button>
                                      <button
                                        onClick={() => openEditModal(teacher)}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        <Edit2 size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(teacher.id!)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {teachers.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No teachers found. Add your first teacher to get started.</p>
            </div>
          )}
        </>
      )}

      {/* Unassigned Teachers Table */}
      {activeTab === 'unassigned' && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnassignedTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <GraduationCap className="text-orange-600" size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{teacher.first_name} {teacher.last_name}</div>
                            {teacher.training_programs && teacher.training_programs.length > 0 && (
                              <div className="flex gap-1">
                                {teacher.training_programs.map((program, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"
                                    title={`Assigned to ${program}`}
                                  >
                                    {program.includes('C.10') ? 'C.10' : program.substring(0, 8)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{teacher.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.subject_specialization || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{teacher.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                        {teacher.plain_passcode || 'Not Set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(teacher.status)}`}>
                        {teacher.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openProfileModal(teacher)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Profile & Trainings"
                        >
                          <Eye size={18} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openAssignModal(teacher)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Assign Training"
                            >
                              <BookOpen size={18} />
                            </button>
                            <button
                              onClick={() => handleToggleAlumni(teacher)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Mark as Alumni"
                            >
                              <GraduationCap size={18} />
                            </button>
                            <button
                              onClick={() => openEditModal(teacher)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(teacher.id!)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 size={18} />
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

          {unassignedTeachers.length === 0 && (
            <div className="text-center py-12 bg-orange-50 rounded-lg">
              <GraduationCap className="mx-auto text-orange-400 mb-4" size={48} />
              <p className="text-gray-600">No unassigned teachers found. All teachers are assigned to schools.</p>
            </div>
          )}
        </>
      )}

      {/* Alumni Teachers Table */}
      {activeTab === 'alumni' && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-purple-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlumniTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <GraduationCap className="text-purple-600" size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{teacher.first_name} {teacher.last_name}</div>
                          </div>
                          <div className="text-sm text-gray-500">{teacher.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.subject_specialization || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{teacher.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded inline-block">
                        {teacher.plain_passcode || 'Not Set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(teacher.status)}`}>
                        {teacher.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openProfileModal(teacher)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Profile & Trainings"
                        >
                          <Eye size={18} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleToggleAlumni(teacher)}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Active (Remove Alumni)"
                            >
                              <GraduationCap size={18} />
                            </button>
                            <button
                              onClick={() => openEditModal(teacher)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(teacher.id!)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 size={18} />
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

          {alumniTeachers.length === 0 && (
            <div className="text-center py-12 bg-purple-50 rounded-lg">
              <GraduationCap className="mx-auto text-purple-400 mb-4" size={48} />
              <p className="text-gray-600">No alumni teachers found.</p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                  <select
                    value={formData.school_id}
                    onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Specialization</label>
                  <input
                    type="text"
                    value={formData.subject_specialization}
                    onChange={(e) => setFormData({ ...formData, subject_specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g., B.Ed, M.Ed, Ph.D"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold text-blue-600">Login Passcode / Password</label>
                  <input
                    type="text"
                    value={formData.plain_passcode}
                    onChange={(e) => setFormData({ ...formData, plain_passcode: e.target.value })}
                    placeholder="Set login password for teacher"
                    className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
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
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="is_alumni"
                  checked={formData.is_alumni}
                  onChange={(e) => setFormData({ ...formData, is_alumni: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_alumni" className="text-sm font-medium text-gray-700">
                  Mark as Alumni
                </label>
              </div>

              {/* HR Section Divider */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                  HR Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID / Staff Code</label>
                    <input
                      type="text"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="e.g., HAUNA-T-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
                  <input
                    type="url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    placeholder="https://... (paste image link)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.photo_url && (
                    <img src={formData.photo_url} alt="Preview" className="mt-2 h-16 w-16 rounded-full object-cover border-2 border-blue-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full residential address"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-red-400 rounded-full"></span>
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="Full name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_relationship}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                      placeholder="e.g., Spouse, Parent"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                  {editingTeacher ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Assign Training</h3>
            <p className="text-gray-600 mb-4">
              Assigning <span className="font-semibold">{selectedTeacher.first_name} {selectedTeacher.last_name}</span> to training.
            </p>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Training Program *</label>
                <select
                  required
                  value={assignForm.training_program_id}
                  onChange={(e) => setAssignForm({ ...assignForm, training_program_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>{program.title} ({program.duration_hours}h)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignForm.due_date}
                  onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <ProfessionalTeacherProfile 
                teacher={selectedTeacher}
                assignments={teacherAssignments}
                attendance={teacherAttendance}
                school={selectedTeacher.school || null}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="warning"
        />
      )}
    </div>
  );
}
