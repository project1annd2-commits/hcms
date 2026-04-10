import React, { useState, useEffect } from 'react';
import { Mentor, School, Permission, User, TrainingProgram, TrainingAssignment, TrainingAttendance } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, Users, Search, Eye, BookOpen, Building2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type MentorWithSchool = Mentor & {
  school?: School;
  training_programs?: string[];
};

type AssignmentWithDetails = TrainingAssignment & {
  training_program?: TrainingProgram;
};

export default function MentorManagement({ currentUser, currentPermissions }: Props) {
  const [mentors, setMentors] = useState<MentorWithSchool[]>([]);
  const [allGlobalMentors, setAllGlobalMentors] = useState<MentorWithSchool[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<MentorWithSchool[]>([]);
  const [unassignedMentors, setUnassignedMentors] = useState<MentorWithSchool[]>([]);
  const [filteredUnassignedMentors, setFilteredUnassignedMentors] = useState<MentorWithSchool[]>([]);
  const [alumniMentors, setAlumniMentors] = useState<MentorWithSchool[]>([]);
  const [filteredAlumniMentors, setFilteredAlumniMentors] = useState<MentorWithSchool[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [allSchoolsGlobal, setAllSchoolsGlobal] = useState<School[]>([]);
  const [mySchoolIds, setMySchoolIds] = useState<string[]>([]);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('');
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [nameSearch, setNameSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'school' | 'unassigned' | 'alumni'>('school');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<MentorWithSchool | null>(null);
  const [mentorAssignments, setMentorAssignments] = useState<AssignmentWithDetails[]>([]);
  const [mentorAttendance, setMentorAttendance] = useState<TrainingAttendance[]>([]);
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
    specialization: '',
    years_of_experience: 0,
    status: 'active' as 'active' | 'inactive',
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

  const canManage = currentPermissions.can_manage_mentors || currentUser.role === 'employee';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let sourceList: MentorWithSchool[] = mentors;

    if (phoneSearch.trim()) {
      sourceList = allGlobalMentors;
    }

    let filtered = sourceList;
    let filteredUnassigned = unassignedMentors;

    // Apply Phone Search
    if (phoneSearch.trim()) {
      const term = phoneSearch.trim().replace(/\s+/g, '');
      filtered = filtered.filter(m => m.phone?.replace(/\s+/g, '').includes(term));
      filteredUnassigned = unassignedMentors.filter(m => m.phone?.replace(/\s+/g, '').includes(term));
    }

    // Apply Name Search
    if (nameSearch.trim()) {
      const term = nameSearch.trim().toLowerCase();
      filtered = filtered.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(term) ||
        m.first_name.toLowerCase().includes(term) ||
        m.last_name.toLowerCase().includes(term)
      );
      filteredUnassigned = filteredUnassigned.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(term) ||
        m.first_name.toLowerCase().includes(term) ||
        m.last_name.toLowerCase().includes(term)
      );
    }

    // Apply School Filter
    if (selectedSchoolFilter) {
      filtered = filtered.filter(m => m.school_id === selectedSchoolFilter);
    }

    setFilteredMentors(filtered);
    setFilteredUnassignedMentors(filteredUnassigned);

    // Alumni Search
    let filteredAlumni = alumniMentors;
    if (phoneSearch.trim()) {
      const term = phoneSearch.trim().replace(/\s+/g, '');
      filteredAlumni = alumniMentors.filter(m => m.phone?.replace(/\s+/g, '').includes(term));
    }
    if (nameSearch.trim()) {
      const term = nameSearch.trim().toLowerCase();
      filteredAlumni = filteredAlumni.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(term) ||
        m.first_name.toLowerCase().includes(term) ||
        m.last_name.toLowerCase().includes(term)
      );
    }
    setFilteredAlumniMentors(filteredAlumni);
  }, [selectedSchoolFilter, phoneSearch, nameSearch, mentors, unassignedMentors, allGlobalMentors, alumniMentors]);

  const loadData = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];

      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
      }
      setMySchoolIds(assignedSchoolIds);

      // Fetch ALL Schools
      const allSchoolsData = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
      setAllSchoolsGlobal(allSchoolsData);

      // Set "My Schools" for filter dropdown
      let mySchoolsData: School[] = [];
      if (currentUser.role === 'admin') {
        mySchoolsData = allSchoolsData;
      } else {
        mySchoolsData = allSchoolsData.filter(s => s.id && assignedSchoolIds.includes(s.id));
      }
      setSchools(mySchoolsData);

      // Load ALL mentors
      const allMentorsData = await db.find<Mentor>(Collections.MENTORS, {}, { sort: { last_name: 1 } });

      // Load training assignments
      const assignmentsData = await db.find(Collections.MENTOR_TRAINING_ASSIGNMENTS, {});
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
      setPrograms(allPrograms);

      // Map ALL mentors with school details and training programs
      const mappedAllMentors = allMentorsData.map(m => {
        const mentorPrograms = assignmentsData
          .filter((a: any) => a.mentor_id === m.id)
          .map((a: any) => allPrograms.find(p => p.id === a.training_program_id)?.title)
          .filter(Boolean) as string[];

        return {
          ...m,
          school: allSchoolsData.find(s => s.id === m.school_id),
          training_programs: mentorPrograms
        };
      });
      setAllGlobalMentors(mappedAllMentors);

      // Get non-alumni mentors
      const nonAlumniMentors = mappedAllMentors.filter(m => !m.is_alumni);

      // Define "My Mentors" (non-alumni)
      let myMentorsData: MentorWithSchool[] = [];
      if (currentUser.role === 'admin') {
        myMentorsData = nonAlumniMentors.filter(m => m.school_id);
      } else {
        myMentorsData = nonAlumniMentors.filter(m => m.school_id && assignedSchoolIds.includes(m.school_id));
      }
      setMentors(myMentorsData);
      setFilteredMentors(myMentorsData);

      // Unassigned Mentors (non-alumni)
      const mappedUnassigned = nonAlumniMentors.filter(m => !m.school_id);
      setUnassignedMentors(mappedUnassigned);
      setFilteredUnassignedMentors(mappedUnassigned);

      // Alumni Mentors
      let alumniData: MentorWithSchool[] = [];
      const allAlumniMapped = mappedAllMentors.filter(m => m.is_alumni);

      if (currentUser.role === 'admin') {
        alumniData = allAlumniMapped;
      } else {
        alumniData = allAlumniMapped.filter(m =>
          !m.school_id || assignedSchoolIds.includes(m.school_id)
        );
      }

      setAlumniMentors(alumniData);
      setFilteredAlumniMentors(alumniData);
    } catch (error) {
      console.error('Error loading mentor data:', error);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      school_id: formData.school_id || null,
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
      if (editingMentor && editingMentor.id) {
        await db.updateById<Mentor>(Collections.MENTORS, editingMentor.id, data);
      } else {
        await db.insertOne<Mentor>(Collections.MENTORS, {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }

      loadData();
      resetForm();
    } catch (error: any) {
      console.error('Error saving mentor:', error);
      alert('Failed to save mentor: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate Mentor',
      message: 'Are you sure you want to deactivate this mentor? They will no longer appear in active lists, but their history will be preserved.',
      onConfirm: async () => {
        await db.updateById(Collections.MENTORS, id, { 
          status: 'inactive',
          updated_at: new Date().toISOString()
        });
        setConfirmDialog(null);
        loadData();
      }
    });
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      school_id: '',
      specialization: '',
      years_of_experience: 0,
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
    setEditingMentor(null);
    setShowModal(false);
  };

  const openEditModal = (mentor: Mentor) => {
    setEditingMentor(mentor);
    setFormData({
      first_name: mentor.first_name,
      last_name: mentor.last_name,
      email: mentor.email,
      phone: mentor.phone,
      school_id: mentor.school_id || '',
      specialization: mentor.specialization || '',
      years_of_experience: mentor.years_of_experience || 0,
      status: mentor.status,
      is_alumni: mentor.is_alumni || false,
      plain_passcode: mentor.plain_passcode || '',
      employee_id: mentor.employee_id || '',
      gender: mentor.gender || '',
      date_of_birth: mentor.date_of_birth || '',
      blood_group: mentor.blood_group || '',
      address: mentor.address || '',
      emergency_contact_name: mentor.emergency_contact?.name || '',
      emergency_contact_relationship: mentor.emergency_contact?.relationship || '',
      emergency_contact_phone: mentor.emergency_contact?.phone || '',
      photo_url: mentor.photo_url || '',
    });
    setShowModal(true);
  };

  const openAssignModal = (mentor: MentorWithSchool) => {
    setSelectedMentor(mentor);
    setAssignForm({
      training_program_id: '',
      due_date: '',
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor || !assignForm.training_program_id) return;

    try {
      await db.insertOne(Collections.MENTOR_TRAINING_ASSIGNMENTS, {
        mentor_id: selectedMentor.id,
        training_program_id: assignForm.training_program_id,
        due_date: assignForm.due_date || null,
        status: 'assigned',
        progress_percentage: 0,
        assigned_by: currentUser.id,
        assigned_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      alert('Mentor has been successfully assigned to training');
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

  const openProfileModal = async (mentor: MentorWithSchool) => {
    setSelectedMentor(mentor);

    try {
      const [assignments, attendance] = await Promise.all([
        db.find(Collections.MENTOR_TRAINING_ASSIGNMENTS, { mentor_id: mentor.id }, { sort: { assigned_date: -1 } }),
        db.find<TrainingAttendance>(Collections.MENTOR_TRAINING_ATTENDANCE, { mentor_id: mentor.id }).then(records =>
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

      setMentorAssignments(mappedAssignments);
      setMentorAttendance(mappedAttendance);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error loading mentor profile:', error);
    }
  };

  // Helper to determine if current user owns a mentor
  const isMyMentor = (mentor: MentorWithSchool) => {
    if (currentUser.role === 'admin') return true;
    if (!mentor.school_id) return true;
    return mySchoolIds.includes(mentor.school_id);
  };

  // Helper to get schools list for display
  const getSchoolsForDisplay = () => {
    if (phoneSearch.trim()) {
      const schoolIds = Array.from(new Set(filteredMentors.map(m => m.school_id).filter(Boolean) as string[]));
      return allSchoolsGlobal.filter(s => s.id && schoolIds.includes(s.id));
    }
    return schools;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const schoolsToRender = getSchoolsForDisplay();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mentor Management</h2>
          <p className="text-gray-600 mt-1">Manage mentor profiles and assignments</p>
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
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Mentor
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
            School Mentors
            <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
              {mentors.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'unassigned'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Unassigned Mentors
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${unassignedMentors.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
              }`}>
              {unassignedMentors.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('alumni')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'alumni'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Alumni Mentors
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${alumniMentors.length > 0 ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
              }`}>
              {alumniMentors.length}
            </span>
          </button>
        </nav>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {activeTab === 'school' ? (
            <>
              Showing <span className="font-semibold text-gray-900">{filteredMentors.length}</span> of <span className="font-semibold text-gray-900">{mentors.length}</span> school mentors
            </>
          ) : activeTab === 'unassigned' ? (
            <>
              Showing <span className="font-semibold text-gray-900">{filteredUnassignedMentors.length}</span> of <span className="font-semibold text-gray-900">{unassignedMentors.length}</span> unassigned mentors
            </>
          ) : (
            <>
              Showing <span className="font-semibold text-gray-900">{filteredAlumniMentors.length}</span> of <span className="font-semibold text-gray-900">{alumniMentors.length}</span> alumni mentors
            </>
          )}
          {(selectedSchoolFilter || phoneSearch || nameSearch) && (
            <span className="ml-2 text-blue-600">
              (
              {selectedSchoolFilter && `school: ${allSchoolsGlobal.find(s => s.id === selectedSchoolFilter)?.name}`}
              {phoneSearch && `${selectedSchoolFilter ? ', ' : ''}phone: "${phoneSearch}"`}
              {nameSearch && `${(selectedSchoolFilter || phoneSearch) ? ', ' : ''}name: "${nameSearch}"}`}
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

      {/* School Mentors Table - Grouped by School */}
      {activeTab === 'school' && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schoolsToRender
                  .filter(school => {
                    if (selectedSchoolFilter && school.id !== selectedSchoolFilter) return false;
                    return filteredMentors.some(m => m.school_id === school.id);
                  })
                  .map(school => {
                    const schoolMentors = filteredMentors.filter(m => m.school_id === school.id);
                    if (schoolMentors.length === 0) return null;

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
                                {schoolMentors.length} Mentors
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Mentor Rows */}
                        {schoolMentors.map((mentor) => {
                          const isOwnMentor = isMyMentor(mentor);
                          return (
                            <tr key={mentor.id} className={`hover:bg-gray-50 ${!isOwnMentor ? 'bg-gray-50/30' : ''}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isOwnMentor ? 'bg-green-100' : 'bg-gray-100'}`}>
                                    <Users className={isOwnMentor ? "text-green-600" : "text-gray-400"} size={20} />
                                  </div>
                                  <div className="ml-4">
                                    <div className="flex items-center gap-2">
                                      <div className={`text-sm font-medium ${isOwnMentor ? 'text-gray-900' : 'text-gray-600'}`}>{mentor.first_name} {mentor.last_name}</div>
                                      {mentor.training_programs && mentor.training_programs.length > 0 && (
                                        <div className="flex gap-1">
                                          {mentor.training_programs.map((program, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                                              title={`Assigned to ${program}`}
                                            >
                                              {program.includes('B4') ? 'B4' : program.substring(0, 8)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">{mentor.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{mentor.specialization || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{mentor.phone || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                                  {mentor.plain_passcode || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(mentor.status)}`}>
                                  {mentor.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openProfileModal(mentor)}
                                    className="text-purple-600 hover:text-purple-900"
                                    title="View Profile & Trainings"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  {canManage && isOwnMentor && (
                                    <>
                                      <button
                                        onClick={() => openAssignModal(mentor)}
                                        className="text-orange-600 hover:text-orange-900"
                                        title="Assign Training"
                                      >
                                        <BookOpen size={18} />
                                      </button>
                                      <button
                                        onClick={() => openEditModal(mentor)}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        <Edit2 size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(mentor.id!)}
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

          {mentors.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No mentors found. Add your first mentor to get started.</p>
            </div>
          )}
        </>
      )}

      {/* Unassigned Mentors Table */}
      {activeTab === 'unassigned' && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnassignedMentors.map((mentor) => (
                  <tr key={mentor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Users className="text-orange-600" size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{mentor.first_name} {mentor.last_name}</div>
                            {mentor.training_programs && mentor.training_programs.length > 0 && (
                              <div className="flex gap-1">
                                {mentor.training_programs.map((program, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"
                                    title={`Assigned to ${program}`}
                                  >
                                    {program.includes('B4') ? 'B4' : program.substring(0, 8)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{mentor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mentor.specialization || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{mentor.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                        {mentor.plain_passcode || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(mentor.status)}`}>
                        {mentor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openProfileModal(mentor)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Profile & Trainings"
                        >
                          <Eye size={18} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openAssignModal(mentor)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Assign Training"
                            >
                              <BookOpen size={18} />
                            </button>
                            <button
                              onClick={() => openEditModal(mentor)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(mentor.id!)}
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

          {unassignedMentors.length === 0 && (
            <div className="text-center py-12 bg-orange-50 rounded-lg">
              <Users className="mx-auto text-orange-400 mb-4" size={48} />
              <p className="text-gray-600">No unassigned mentors found. All mentors are assigned to schools.</p>
            </div>
          )}
        </>
      )}

      {/* Alumni Mentors Table */}
      {activeTab === 'alumni' && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-purple-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlumniMentors.map((mentor) => (
                  <tr key={mentor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="text-purple-600" size={20} />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">{mentor.first_name} {mentor.last_name}</div>
                          </div>
                          <div className="text-sm text-gray-500">{mentor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mentor.specialization || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{mentor.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block">
                        {mentor.plain_passcode || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(mentor.status)}`}>
                        {mentor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openProfileModal(mentor)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Profile & Trainings"
                        >
                          <Eye size={18} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEditModal(mentor)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(mentor.id!)}
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

          {alumniMentors.length === 0 && (
            <div className="text-center py-12 bg-purple-50 rounded-lg">
              <Users className="mx-auto text-purple-400 mb-4" size={48} />
              <p className="text-gray-600">No alumni mentors found.</p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingMentor ? 'Edit Mentor' : 'Add New Mentor'}</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
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
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login Passcode / Password</label>
                <input
                  type="text"
                  value={formData.plain_passcode}
                  onChange={(e) => setFormData({ ...formData, plain_passcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Set login passcode"
                />
                <p className="text-xs text-gray-500 mt-1">If set, mentor must use this passcode to login.</p>
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

              {/* HR Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                  HR Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID / Staff Code</label>
                    <input
                      type="text"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="e.g., HAUNA-M-001"
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
                    <img src={formData.photo_url} alt="Preview" className="mt-2 h-16 w-16 rounded-full object-cover border-2 border-green-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
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
                  {editingMentor ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }

      {
        showAssignModal && selectedMentor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Assign Training</h3>
              <p className="text-gray-600 mb-4">
                Assigning <span className="font-semibold">{selectedMentor.first_name} {selectedMentor.last_name}</span> to training.
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
        )
      }

      {
        showProfileModal && selectedMentor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="text-green-600" size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedMentor.first_name} {selectedMentor.last_name}
                    </h3>
                    <p className="text-gray-600">{selectedMentor.email}</p>
                    <p className="text-sm text-gray-500">
                      {selectedMentor.school?.name || 'Unassigned'} • {selectedMentor.specialization}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(selectedMentor.status)}`}>
                    {selectedMentor.status}
                  </span>
                  {selectedMentor.years_of_experience && (
                    <span className="text-sm text-gray-500">
                      {selectedMentor.years_of_experience} years of experience
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Login Information</h4>
                    <p className="text-sm text-gray-700">
                      Mentors can login using their registered phone number and passcode.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-semibold">Phone Number:</span> {selectedMentor.phone || 'Not provided'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Current Passcode:</span> <span className="font-mono bg-white px-1 rounded">{selectedMentor.plain_passcode || 'Not Set'}</span>
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to reset the passcode for ${selectedMentor.first_name}? it will be set to '1234'`)) {
                          try {
                            await db.updateById(Collections.MENTORS, selectedMentor.id!, {
                              plain_passcode: '1234',
                              updated_at: new Date().toISOString()
                            });
                            setSelectedMentor({ ...selectedMentor, plain_passcode: '1234' });
                            alert('Passcode reset to 1234');
                          } catch (error) {
                            alert('Failed to reset passcode');
                          }
                        }
                      }}
                      className="text-xs bg-white border border-blue-300 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors font-bold"
                    >
                      Reset to 1234
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen size={20} />
                  Assigned Training Programs
                </h4>
                {mentorAssignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No training programs assigned yet</p>
                ) : (
                  <div className="space-y-3">
                    {mentorAssignments.map((assignment) => (
                      <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-semibold text-gray-900">{assignment.training_program?.title}</h5>
                            <p className="text-sm text-gray-600">{assignment.training_program?.description}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              assignment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {assignment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-1 font-medium">{assignment.training_program?.duration_hours || 0} hours</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Progress:</span>
                            <span className="ml-1 font-medium">{assignment.progress_percentage}%</span>
                          </div>
                          {assignment.due_date && (
                            <div>
                              <span className="text-gray-500">Due:</span>
                              <span className="ml-1 font-medium">{new Date(assignment.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {assignment.score !== null && (
                            <div>
                              <span className="text-gray-500">Score:</span>
                              <span className="ml-1 font-medium">{assignment.score}%</span>
                            </div>
                          )}
                        </div>
                        {assignment.training_program?.start_date && assignment.training_program?.end_date && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Training Dates:</span> {new Date(assignment.training_program.start_date).toLocaleDateString()} - {new Date(assignment.training_program.end_date).toLocaleDateString()}
                          </div>
                        )}
                        {assignment.training_program?.meeting_link && (
                          <div className="mt-2">
                            <a
                              href={assignment.training_program.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              Join Training Session
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Attendance Summary</h4>
                {mentorAttendance.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No attendance records yet</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {mentorAttendance.filter(a => a.status === 'present').length}
                      </div>
                      <div className="text-sm text-gray-600">Present</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {mentorAttendance.filter(a => a.status === 'absent').length}
                      </div>
                      <div className="text-sm text-gray-600">Absent</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {mentorAttendance.filter(a => a.status === 'late').length}
                      </div>
                      <div className="text-sm text-gray-600">Late</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {mentorAttendance.filter(a => a.status === 'excused').length}
                      </div>
                      <div className="text-sm text-gray-600">Excused</div>
                    </div>
                  </div>
                )}

                {mentorAttendance.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Attendance Details</h5>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Training Program</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {mentorAttendance.slice(0, 10).map((attendance: any) => {
                          const program = Array.isArray(attendance.training_program) ? attendance.training_program[0] : attendance.training_program;
                          return (
                            <tr key={attendance.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-900">
                                {new Date(attendance.attendance_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-gray-600">
                                {program?.title || 'N/A'}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                                ${attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                                    attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                                      attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'}`}>
                                  {attendance.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-600 text-xs">
                                {attendance.notes || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {mentorAttendance.length > 10 && (
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Showing 10 most recent records out of {mentorAttendance.length} total
                      </p>
                    )}
                  </div>
                )}
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
        )
      }


      {
        confirmDialog && (
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
        )
      }
    </div >
  );
}
