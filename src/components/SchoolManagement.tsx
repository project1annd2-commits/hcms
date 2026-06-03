import { useState, useEffect } from 'react';
import { School, Permission, User, Teacher, Mentor, SchoolFollowup, Student, StudentAssessment } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, Building2, GraduationCap, Users, X, Eye, MessageSquare, Search, CheckCircle2, ClipboardCheck, LayoutGrid, List, Filter, Phone, Mail, User as UserIcon } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import InAppNotification from './Notification';
import LoadingSpinner from './LoadingSpinner';

import StudentManager from './StudentManager';
import { isAsmaAyesha } from '../lib/accessControl';

// All Indian States and Union Territories
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

const YEARS = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - 40 + i).toString());

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type SchoolWithCounts = School & {
  teacherCount: number;
  mentorCount: number;
};

export default function SchoolManagement({ currentUser, currentPermissions }: Props) {
  const [schools, setSchools] = useState<SchoolWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithCounts | null>(null);
  const [schoolTeachers, setSchoolTeachers] = useState<Teacher[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'reports'>('details');
  const [schoolStudents, setSchoolStudents] = useState<Student[]>([]);
  const [studentAssessments, setStudentAssessments] = useState<StudentAssessment[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeReportGrade, setActiveReportGrade] = useState<'H1' | 'H2' | 'H3'>('H1');
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [schoolMentors, setSchoolMentors] = useState<Mentor[]>([]);
  const [schoolFollowups, setSchoolFollowups] = useState<(SchoolFollowup & { employee: User })[]>([]);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showTeacherEditModal, setShowTeacherEditModal] = useState(false);
  const [teacherFormData, setTeacherFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    subject_specialization: '',
    qualification: '',
    status: 'active' as 'active' | 'on_leave' | 'inactive'
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
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

  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    h1_count: 0,
    h2_count: 0,
    h3_count: 0,
    principal_name: '',
    state: '',
    affiliation_date: '',
    affiliation_number: '',
    // New fields
    book_status: '',
    themes_status: '',
    onboarding_status: 'Active',
    performance_category: '',
    allocation_date: '',
    audit_status: '',
    village_area: '',
    town_city: '',
    district: '',
    source: '',
    affiliation_year: '',
    alumni_year: '',
    lead_owner: '',
    updated_at: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [selectedAlumniSchoolId, setSelectedAlumniSchoolId] = useState<string | null>(null);
  const [alumniYear, setAlumniYear] = useState(new Date().getFullYear().toString());
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeSchoolTab, setActiveSchoolTab] = useState<'active' | 'alumni' | 'non-onboarded'>('active');
  const [filters, setFilters] = useState({
    book_status: '',
    themes_status: '',
    onboarding_status: '',
    performance_category: '',
    audit_status: '',
    affiliation_year: ''
  });
  const [assignedSchoolIds, setAssignedSchoolIds] = useState<string[]>([]);
  const [allTeachersData, setAllTeachersData] = useState<Teacher[]>([]);
  const [allTrainingAssignments, setAllTrainingAssignments] = useState<any[]>([]);

  const isRafaha = currentUser.role === 'employee' && (currentUser.username.toLowerCase().includes('rafahafarheen54'));
  const canManage = currentPermissions.can_manage_schools || currentUser.role === 'employee';
  const canDelete = currentPermissions.can_delete_schools && !isRafaha;

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      let schoolsData: School[] = [];

      if (currentUser.role !== 'admin' && !isAsmaAyesha(currentUser) && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });

        if (userAssignments && userAssignments.length > 0) {
          const assignedSchoolIds = userAssignments.map(a => a.school_id);
          // Get schools matching assigned IDs
          const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
          schoolsData = allSchools.filter(s =>
            s.id &&
            assignedSchoolIds.includes(s.id)
          ); // 'onboarding', 'active', 'transferred', 'alumni' schools are included (status not excluded)
        }
      } else {
        schoolsData = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
      }

      // Fetch all school assignments to determine which schools are assigned to employees
      const allAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, {});
      const uniqueAssignedIds = [...new Set(allAssignments.map((a: any) => a.school_id as string))];
      setAssignedSchoolIds(uniqueAssignedIds);

      // Optimization: Fetch all teachers, mentors, and training assignments once
      const [allTeachers, allMentors, trainingAssignments] = await Promise.all([
        db.find<Teacher>(Collections.TEACHERS, {}),
        db.find(Collections.MENTORS, {}),
        db.find(Collections.TRAINING_ASSIGNMENTS, {})
      ]);

      setAllTeachersData(allTeachers as Teacher[]);
      setAllTrainingAssignments(trainingAssignments);

      const schoolsWithCounts = schoolsData.map((school) => {
        const teacherCount = allTeachers.filter((t: any) => t.school_id === school.id).length;
        const mentorCount = allMentors.filter((m: any) => m.school_id === school.id).length;

        return {
          ...school,
          teacherCount,
          mentorCount,
        };
      });

      setSchools(schoolsWithCounts);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Sanitize data: Convert empty strings to undefined for optional union types
      const schoolData: Partial<School> = {
        ...formData,
        book_status: formData.book_status ? (formData.book_status as any) : undefined,
        themes_status: formData.themes_status ? (formData.themes_status as any) : undefined,
        onboarding_status: formData.onboarding_status ? (formData.onboarding_status as any) : undefined,
        performance_category: formData.performance_category ? (formData.performance_category as any) : undefined,
        allocation_date: formData.allocation_date || undefined,
        audit_status: formData.audit_status ? (formData.audit_status as any) : undefined,
        village_area: formData.village_area || undefined,
        town_city: formData.town_city || undefined,
        district: formData.district || undefined,
        source: formData.source || undefined,
        affiliation_year: formData.affiliation_year || undefined,
        alumni_year: formData.alumni_year || undefined,
        lead_owner: formData.lead_owner || undefined,
      };

      if (editingSchool && editingSchool.id) {
        await db.updateById<School>(Collections.SCHOOLS, editingSchool.id, {
          ...schoolData,
          updated_at: new Date().toISOString(),
        });
      } else {
        await db.insertOne<School>(Collections.SCHOOLS, {
          ...schoolData,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }

      loadSchools();
      resetForm();
    } catch (error: any) {
      console.error('Error saving school:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save school: ' + error.message
      });
    }

  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete School',
      message: 'Are you sure you want to delete this school? This will also delete all associated teachers, mentors, and training data. This action cannot be undone.',
      onConfirm: async () => {
        await db.deleteById(Collections.SCHOOLS, id);
        setConfirmDialog(null);
        loadSchools();
      }
    });
  };

  const handleAlumni = async () => {
    if (!selectedAlumniSchoolId || !alumniYear.trim()) return;
    try {
      await db.updateById(Collections.SCHOOLS, selectedAlumniSchoolId, {
        status: 'alumni',
        alumni_year: alumniYear.trim(),
        updated_at: new Date().toISOString()
      });
      setShowAlumniModal(false);
      setSelectedAlumniSchoolId(null);
      loadSchools();
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'School marked as Alumni.'
      });
    } catch (error: any) {
      console.error('Error marking school as alumni:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to mark school as alumni: ' + error.message
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      h1_count: 0,
      h2_count: 0,
      h3_count: 0,
      principal_name: '',
      state: '',
      affiliation_date: '',
      affiliation_number: '',
      book_status: '',
      themes_status: '',
      onboarding_status: 'Active',
      performance_category: '',
      allocation_date: '',
      audit_status: '',
      village_area: '',
      town_city: '',
      district: '',
      source: '',
      affiliation_year: '',
      alumni_year: '',
      lead_owner: '',
      updated_at: ''
    });
    setEditingSchool(null);
    setShowModal(false);
  };

  const openEditModal = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      h1_count: school.h1_count,
      h2_count: school.h2_count,
      h3_count: school.h3_count,
      principal_name: school.principal_name || '',
      state: (school as any).state || '',
      affiliation_date: (school as any).affiliation_date || '',
      affiliation_number: (school as any).affiliation_number || '',
      book_status: (school as any).book_status || '',
      themes_status: (school as any).themes_status || '',
      onboarding_status: (school as any).onboarding_status || '',
      performance_category: (school as any).performance_category || '',
      allocation_date: (school as any).allocation_date || '',
      audit_status: (school as any).audit_status || '',
      village_area: (school as any).village_area || '',
      town_city: school.town_city || '',
      district: school.district || '',
      source: school.source || '',
      affiliation_year: school.affiliation_year || '',
      alumni_year: (school as any).alumni_year || '',
      lead_owner: school.lead_owner || '',
      updated_at: school.updated_at || new Date().toISOString()
    });
    setShowModal(true);
  };

  const openDetailModal = async (school: SchoolWithCounts) => {
    setSelectedSchool(school);
    setShowDetailModal(true);
    // Reset tab and data for the new school
    setActiveDetailTab('details');
    setSchoolStudents([]);
    setStudentAssessments([]);
    setActiveReportGrade('H1');

    if (school.id) await loadSchoolDetails(school.id);
  };

  const loadSchoolDetails = async (schoolId: string) => {
    try {
      const [teachers, mentors, followups] = await Promise.all([
        db.find<Teacher>(Collections.TEACHERS, { school_id: schoolId }, { sort: { last_name: 1 } }),
        db.find<Mentor>(Collections.MENTORS, { school_id: schoolId }),
        db.find<SchoolFollowup>(Collections.SCHOOL_FOLLOWUPS, { school_id: schoolId }, { sort: { followup_date: -1 }, limit: 10 })
      ]);

      setSchoolTeachers(teachers);

      // Load mentors directly
      setSchoolMentors(mentors);

      // Load employee data for followups
      if (followups && followups.length > 0) {
        const users = await db.find<User>(Collections.USERS, {});
        const followupsWithEmployees = followups.map((f: any) => ({
          ...f,
          employee: users.find(u => u.id === f.employee_id) || {} as User
        }));
        setSchoolFollowups(followupsWithEmployees as any);
      } else {
        setSchoolFollowups([]);
      }
    } catch (error) {
      console.error('Error loading school details:', error);
    }
  };

  const loadSchoolReports = async (schoolId: string) => {
    setLoadingReports(true);
    try {
      // Fetch all students for the school
      const studentsList = await db.find<Student>(Collections.STUDENTS, {
        school_id: schoolId
      });
      setSchoolStudents(studentsList || []);

      if (studentsList && studentsList.length > 0) {
        const studentIds = studentsList.map(s => s.id!).filter(Boolean);
        if (studentIds.length > 0) {
          // Fetch assessments for these students
          const assessmentsList = await db.find<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, {
            student_id: { $in: studentIds }
          });
          setStudentAssessments(assessmentsList || []);
        }
      }
    } catch (error) {
      console.error('Error loading school reports:', error);
    }
    setLoadingReports(false);
  };

  useEffect(() => {
    if (showDetailModal && selectedSchool && activeDetailTab === 'reports' && schoolStudents.length === 0) {
      loadSchoolReports(selectedSchool.id!);
    }
  }, [showDetailModal, selectedSchool, activeDetailTab]);

  const openTeacherEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone || '',
      subject_specialization: teacher.subject_specialization || '',
      qualification: teacher.qualification || '',
      status: teacher.status
    });
    setShowTeacherEditModal(true);
  };

  const handleTeacherUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !editingTeacher.id) return;

    try {
      await db.updateById<Teacher>(Collections.TEACHERS, editingTeacher.id, teacherFormData);

      setShowTeacherEditModal(false);
      setEditingTeacher(null);
      if (selectedSchool && selectedSchool.id) {
        await loadSchoolDetails(selectedSchool.id);
      }
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update teacher: ' + error.message
      });
    }
  };


  const filteredSchools = schools.filter(school => {
    // Search Term Filter
    const matchesSearch = !schoolSearchTerm.trim() ||
      school.name.toLowerCase().includes(schoolSearchTerm.toLowerCase());

    // Operational Filters
    const matchesBookStatus = !filters.book_status || (school as any).book_status === filters.book_status;
    const matchesThemesStatus = !filters.themes_status || (school as any).themes_status === filters.themes_status;
    const matchesOnboardingStatus = !filters.onboarding_status || (school as any).onboarding_status === filters.onboarding_status;
    const matchesPerformanceCategory = !filters.performance_category || (school as any).performance_category === filters.performance_category;
    const matchesAuditStatus = !filters.audit_status || (school as any).audit_status === filters.audit_status;
    const matchesAffiliationYear = !filters.affiliation_year || ((school as any).affiliation_date && (
      (school as any).affiliation_date.length === 4
        ? (school as any).affiliation_date === filters.affiliation_year
        : new Date((school as any).affiliation_date).getFullYear().toString() === filters.affiliation_year
    ));

    // Tab Filter
    let matchesTab = false;
    if (activeSchoolTab === 'active') {
      matchesTab = !school.status || ['active', 'transferred'].includes(school.status);
    } else if (activeSchoolTab === 'alumni') {
      matchesTab = school.status === 'alumni';
    } else if (activeSchoolTab === 'non-onboarded') {
      matchesTab = school.status === 'onboarding' || (school as any).onboarding_status === 'Not Onboarded';
    }

    return matchesTab && matchesSearch && matchesBookStatus && matchesThemesStatus && matchesOnboardingStatus && matchesPerformanceCategory && matchesAuditStatus && matchesAffiliationYear;
  });

  const clearFilters = () => {
    setFilters({
      book_status: '',
      themes_status: '',
      onboarding_status: '',
      performance_category: '',
      audit_status: '',
      affiliation_year: ''
    });
    setSchoolSearchTerm('');
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || schoolSearchTerm !== '';

  if (loading) {
    return <LoadingSpinner label="Loading Schools" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Management</h2>
          <p className="text-gray-600 mt-1">Manage school profiles and information</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add School
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveSchoolTab('active')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeSchoolTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Active Schools
        </button>
        <button
          onClick={() => setActiveSchoolTab('alumni')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeSchoolTab === 'alumni' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Alumni Schools
        </button>
        <button
          onClick={() => setActiveSchoolTab('non-onboarded')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeSchoolTab === 'non-onboarded' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Non Onboarded Schools
        </button>
      </div>

      {/* Themes Status Analytics */}
      {(() => {
        const activeSchools = schools.filter(s => !(s as any).alumni_year && assignedSchoolIds.includes(s.id!));
        const fullyFollowing = activeSchools.filter(s => (s as any).themes_status === 'Fully Following');
        const partiallyFollowing = activeSchools.filter(s => (s as any).themes_status === 'Partially Following');
        const notFollowing = activeSchools.filter(s => (s as any).themes_status === 'Not Following');
        const notSet = activeSchools.filter(s => !(s as any).themes_status);
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
              <ClipboardCheck size={18} className="text-blue-600" />
              Themes Status Analytics
              <span className="ml-auto text-xs text-gray-400 font-normal">{activeSchools.length} schools</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Fully Following */}
              <button
                onClick={() => { setFilters(f => ({ ...f, themes_status: 'Fully Following' })); setShowFilters(true); }}
                className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 text-left hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">Fully Following</span>
                </div>
                <p className="text-3xl font-black text-emerald-600">{fullyFollowing.length}</p>
                {fullyFollowing.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-20 overflow-y-auto">
                    {fullyFollowing.slice(0, 5).map(s => (
                      <p key={s.id} className="text-[10px] text-emerald-600 truncate">{s.name}</p>
                    ))}
                    {fullyFollowing.length > 5 && <p className="text-[10px] text-emerald-400">+{fullyFollowing.length - 5} more</p>}
                  </div>
                )}
              </button>

              {/* Partially Following */}
              <button
                onClick={() => { setFilters(f => ({ ...f, themes_status: 'Partially Following' })); setShowFilters(true); }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-left hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase">Partially Following</span>
                </div>
                <p className="text-3xl font-black text-amber-600">{partiallyFollowing.length}</p>
                {partiallyFollowing.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-20 overflow-y-auto">
                    {partiallyFollowing.slice(0, 5).map(s => (
                      <p key={s.id} className="text-[10px] text-amber-600 truncate">{s.name}</p>
                    ))}
                    {partiallyFollowing.length > 5 && <p className="text-[10px] text-amber-400">+{partiallyFollowing.length - 5} more</p>}
                  </div>
                )}
              </button>

              {/* Not Following */}
              <button
                onClick={() => { setFilters(f => ({ ...f, themes_status: 'Not Following' })); setShowFilters(true); }}
                className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 text-left hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-[11px] font-bold text-red-700 uppercase">Not Following</span>
                </div>
                <p className="text-3xl font-black text-red-600">{notFollowing.length}</p>
                {notFollowing.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-20 overflow-y-auto">
                    {notFollowing.slice(0, 5).map(s => (
                      <p key={s.id} className="text-[10px] text-red-600 truncate">{s.name}</p>
                    ))}
                    {notFollowing.length > 5 && <p className="text-[10px] text-red-400">+{notFollowing.length - 5} more</p>}
                  </div>
                )}
              </button>

              {/* Not Set */}
              <button
                onClick={() => { setFilters(f => ({ ...f, themes_status: '' })); setShowFilters(false); }}
                className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4 text-left hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-[11px] font-bold text-gray-600 uppercase">Not Set</span>
                </div>
                <p className="text-3xl font-black text-gray-500">{notSet.length}</p>
                {notSet.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-20 overflow-y-auto">
                    {notSet.slice(0, 5).map(s => (
                      <p key={s.id} className="text-[10px] text-gray-500 truncate">{s.name}</p>
                    ))}
                    {notSet.length > 5 && <p className="text-[10px] text-gray-400">+{notSet.length - 5} more</p>}
                  </div>
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Training Analytics */}
      {(() => {
        // Only teachers from schools assigned to employees
        const assignedTeachers = allTeachersData.filter(t => t.school_id && assignedSchoolIds.includes(t.school_id));

        const trainedQualified = assignedTeachers.filter(t => {
          const assignments = allTrainingAssignments.filter(a => a.teacher_id === t.id);
          return assignments.some(a => a.status === 'completed' && a.marks_published);
        });

        const attendedNotQualified = assignedTeachers.filter(t => {
          const assignments = allTrainingAssignments.filter(a => a.teacher_id === t.id);
          if (assignments.length === 0) return false;
          // Has assignments but none completed+published
          return !assignments.some(a => a.status === 'completed' && a.marks_published);
        });

        const notTrained = assignedTeachers.filter(t => {
          return !allTrainingAssignments.some(a => a.teacher_id === t.id);
        });

        // Helper to get school name
        const getSchoolName = (schoolId: string) => schools.find(s => s.id === schoolId)?.name || 'Unknown';

        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
              <GraduationCap size={18} className="text-purple-600" />
              Training Analytics
              <span className="ml-auto text-xs text-gray-400 font-normal">{assignedTeachers.length} teachers from assigned schools</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Trained & Qualified */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">Trained & Qualified</span>
                </div>
                <p className="text-3xl font-black text-emerald-600">{trainedQualified.length}</p>
                <p className="text-[10px] text-emerald-500 mt-1">Completed training + marks published</p>
                {trainedQualified.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                    {trainedQualified.slice(0, 5).map(t => (
                      <p key={t.id} className="text-[10px] text-emerald-600 truncate">
                        {t.first_name} {t.last_name} <span className="text-emerald-400">• {getSchoolName(t.school_id!)}</span>
                      </p>
                    ))}
                    {trainedQualified.length > 5 && <p className="text-[10px] text-emerald-400">+{trainedQualified.length - 5} more</p>}
                  </div>
                )}
              </div>

              {/* Attended, Not Qualified */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase">Attended, Not Qualified</span>
                </div>
                <p className="text-3xl font-black text-amber-600">{attendedNotQualified.length}</p>
                <p className="text-[10px] text-amber-500 mt-1">Assigned but marks not published</p>
                {attendedNotQualified.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                    {attendedNotQualified.slice(0, 5).map(t => (
                      <p key={t.id} className="text-[10px] text-amber-600 truncate">
                        {t.first_name} {t.last_name} <span className="text-amber-400">• {getSchoolName(t.school_id!)}</span>
                      </p>
                    ))}
                    {attendedNotQualified.length > 5 && <p className="text-[10px] text-amber-400">+{attendedNotQualified.length - 5} more</p>}
                  </div>
                )}
              </div>

              {/* Not Trained */}
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-[11px] font-bold text-red-700 uppercase">Not Trained</span>
                </div>
                <p className="text-3xl font-black text-red-600">{notTrained.length}</p>
                <p className="text-[10px] text-red-500 mt-1">No training assignment at all</p>
                {notTrained.length > 0 && (
                  <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                    {notTrained.slice(0, 5).map(t => (
                      <p key={t.id} className="text-[10px] text-red-600 truncate">
                        {t.first_name} {t.last_name} <span className="text-red-400">• {getSchoolName(t.school_id!)}</span>
                      </p>
                    ))}
                    {notTrained.length > 5 && <p className="text-[10px] text-red-400">+{notTrained.length - 5} more</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Search Bar & View Toggle */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search schools by name..."
              value={schoolSearchTerm}
              onChange={(e) => setSchoolSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all text-sm font-medium ${showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={18} />
            Filters {hasActiveFilters && <span className="bg-blue-600 text-white w-2 h-2 rounded-full"></span>}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            title="Grid View"
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            title="List View"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Affiliation Year</label>
              <select
                value={filters.affiliation_year}
                onChange={(e) => setFilters({ ...filters, affiliation_year: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Years</option>
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Book Status</label>
              <select
                value={filters.book_status}
                onChange={(e) => setFilters({ ...filters, book_status: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Purchased">Purchased</option>
                <option value="Not Purchased">Not Purchased</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Themes Status</label>
              <select
                value={filters.themes_status}
                onChange={(e) => setFilters({ ...filters, themes_status: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Fully Following">Fully Following</option>
                <option value="Partially Following">Partially Following</option>
                <option value="Not Following">Not Following</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Onboarding Status</label>
              <select
                value={filters.onboarding_status}
                onChange={(e) => setFilters({ ...filters, onboarding_status: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Onboarded">Onboarded</option>
                <option value="Partial">Partial</option>
                <option value="Not Onboarded">Not Onboarded</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
              <select
                value={filters.performance_category}
                onChange={(e) => setFilters({ ...filters, performance_category: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Audit Status</label>
              <select
                value={filters.audit_status}
                onChange={(e) => setFilters({ ...filters, audit_status: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Not Completed">Not Completed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSchools
              .map((school) => (
                <div key={school.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
                  {/* Premium Accent Stripe */}
                  <div className={`h-1.5 w-full ${
                    (school as any).performance_category === 'A' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                    (school as any).performance_category === 'B' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                    'bg-gradient-to-r from-rose-400 to-red-500'
                  }`} />
                  
                  <div className="p-5">
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shadow-inner ${
                          (school as any).performance_category === 'A' ? 'bg-emerald-50 text-emerald-600' :
                          (school as any).performance_category === 'B' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          <Building2 size={22} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 leading-tight truncate group-hover:text-blue-600 transition-colors">
                            {school.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                              #{school.code}
                            </span>
                            {(school as any).performance_category && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                                (school as any).performance_category === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                (school as any).performance_category === 'B' ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                Cat {(school as any).performance_category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Operational Badges */}
                      <div className="flex flex-col gap-1 items-end">
                        {(school as any).book_status === 'Purchased' && (
                          <div className="bg-emerald-600 text-white p-1 rounded-full shadow-lg shadow-emerald-100" title="Books Purchased">
                            <CheckCircle2 size={12} strokeWidth={3} />
                          </div>
                        )}
                        {(school as any).onboarding_status === 'Onboarded' && (
                          <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg shadow-blue-100" title="Fully Onboarded">
                            <ClipboardCheck size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-gray-50/50 rounded-xl p-2.5 flex items-center gap-3 border border-gray-100/50">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                          <GraduationCap className="text-emerald-600" size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-medium">Teachers</p>
                          <p className="text-xs font-bold text-gray-900">{school.teacherCount}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50/50 rounded-xl p-2.5 flex items-center gap-3 border border-gray-100/50">
                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                          <Users className="text-amber-600" size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-medium">Mentors</p>
                          <p className="text-xs font-bold text-gray-900">{school.mentorCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Grade Distribution */}
                    <div className="bg-blue-50/30 rounded-xl p-2.5 mb-4 border border-blue-50/50">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Grade Counts</span>
                        <LayoutGrid size={10} className="text-blue-400" />
                      </div>
                      <div className="flex items-center justify-around">
                        <div className="text-center">
                          <span className="block text-[9px] text-blue-500 font-semibold uppercase">H1</span>
                          <span className="text-sm font-black text-blue-900">{school.h1_count}</span>
                        </div>
                        <div className="w-px h-6 bg-blue-100/50" />
                        <div className="text-center">
                          <span className="block text-[9px] text-blue-500 font-semibold uppercase">H2</span>
                          <span className="text-sm font-black text-blue-900">{school.h2_count || '0'}</span>
                        </div>
                        <div className="w-px h-6 bg-blue-100/50" />
                        <div className="text-center">
                          <span className="block text-[9px] text-blue-500 font-semibold uppercase">H3</span>
                          <span className="text-sm font-black text-blue-900">{school.h3_count || '0'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info Block */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 group/info">
                        <div className="text-gray-400 group-hover/info:text-blue-600 transition-colors">
                          <UserIcon size={14} />
                        </div>
                        <span className="text-xs text-gray-600 font-medium truncate">
                          {school.principal_name || 'No Principal Assigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 group/info">
                        <div className="text-gray-400 group-hover/info:text-emerald-600 transition-colors">
                          <Phone size={14} />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">
                          {school.phone || 'Phone N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 group/info">
                        <div className="text-gray-400 group-hover/info:text-orange-600 transition-colors">
                          <Mail size={14} />
                        </div>
                        <span className="text-xs text-gray-600 font-medium truncate">
                          {school.email || 'Email N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-50">
                      <button
                        onClick={() => openDetailModal(school)}
                        className="flex-1 h-9 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all duration-300"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(school)}
                            className="w-9 h-9 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-xl transition-all"
                            title="Edit School"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAlumniSchoolId(school.id || null);
                              setShowAlumniModal(true);
                            }}
                            className="w-9 h-9 flex items-center justify-center text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all"
                            title="Mark as Alumni"
                          >
                            <GraduationCap size={16} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => school.id && handleDelete(school.id)}
                              className="w-9 h-9 flex items-center justify-center text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all"
                              title="Delete School"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-bottom border-gray-200">
                    <th className="px-4 py-3 font-semibold text-gray-700">Sl. No</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">School Details</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Principal</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center">Grade Counts</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center">T/M</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSchools
                    .map((school, index) => (
                      <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-medium">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{school.name}</span>
                            <span className="text-xs text-gray-500">Code: {school.code}</span>
                            {school.state && <span className="text-[10px] text-blue-600 font-medium uppercase mt-0.5">{school.state}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col text-xs">
                            <span className="text-gray-900 font-medium">{school.principal_name || 'N/A'}</span>
                            <span className="text-gray-500">{school.phone || ''}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-4 text-xs">
                            <div className="flex flex-col">
                              <span className="text-gray-400 font-medium">H1</span>
                              <span className="font-bold text-gray-900">{school.h1_count}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-400 font-medium">H2</span>
                              <span className="font-bold text-gray-900">{school.h2_count}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-400 font-medium">H3</span>
                              <span className="font-bold text-gray-900">{school.h3_count}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 font-medium">T</span>
                              <span className="text-xs font-bold text-green-600">{school.teacherCount}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 font-medium">M</span>
                              <span className="text-xs font-bold text-yellow-600">{school.mentorCount}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetailModal(school)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => openEditModal(school)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAlumniSchoolId(school.id || null);
                                    setShowAlumniModal(true);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Mark as Alumni"
                                >
                                  <GraduationCap size={16} />
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => school.id && handleDelete(school.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
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
        )
      }

      {
        schools.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No schools found. Add your first school to get started.</p>
          </div>
        )
      }

      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">{editingSchool ? 'Edit School' : 'Add New School'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                    <input
                      type="text"
                      value={formData.principal_name}
                      onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation Year</label>
                    <select
                      value={(formData as any).affiliation_date || ''}
                      onChange={(e) => setFormData({ ...formData, affiliation_date: e.target.value } as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Year</option>
                      {YEARS.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation Number</label>
                    <input
                      type="text"
                      value={(formData as any).affiliation_number || ''}
                      onChange={(e) => setFormData({ ...formData, affiliation_number: e.target.value } as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">H1 Category</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.h1_count}
                      onChange={(e) => setFormData({ ...formData, h1_count: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">H2 Category</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.h2_count}
                      onChange={(e) => setFormData({ ...formData, h2_count: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">H3 Category</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.h3_count}
                      onChange={(e) => setFormData({ ...formData, h3_count: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="e.g. Hyderabad"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Town/City</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      value={formData.town_city}
                      onChange={(e) => setFormData({ ...formData, town_city: e.target.value })}
                      placeholder="e.g. Jubilee Hills"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Village/Area</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      value={formData.village_area}
                      onChange={(e) => setFormData({ ...formData, village_area: e.target.value })}
                      placeholder="e.g. Road No. 10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* New Operational Status Section */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <ClipboardCheck className="text-blue-600" size={18} />
                    Operational Status (HCMS)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Book Status</label>
                      <select
                        value={(formData as any).book_status || ''}
                        onChange={(e) => setFormData({ ...formData, book_status: e.target.value } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Status</option>
                        <option value="Purchased">Purchased</option>
                        <option value="Not Purchased">Not Purchased</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Themes Status</label>
                      <select
                        value={(formData as any).themes_status || ''}
                        onChange={(e) => setFormData({ ...formData, themes_status: e.target.value } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Status</option>
                        <option value="Fully Following">Fully Following</option>
                        <option value="Partially Following">Partially Following</option>
                        <option value="Not Following">Not Following</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Onboarding Status</label>
                      <select
                        value={(formData as any).onboarding_status || ''}
                        onChange={(e) => setFormData({ ...formData, onboarding_status: e.target.value } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Status</option>
                        <option value="Onboarded">Onboarded</option>
                        <option value="Active">Active</option>
                        <option value="Partial">Partial</option>
                        <option value="Not Onboarded">Not Onboarded</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Performance Category</label>
                      <select
                        value={(formData as any).performance_category || ''}
                        onChange={(e) => setFormData({ ...formData, performance_category: e.target.value } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Category</option>
                        <option value="A">Category A</option>
                        <option value="B">Category B</option>
                        <option value="C">Category C</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Audit Status</label>
                      <select
                        value={(formData as any).audit_status || ''}
                        onChange={(e) => setFormData({ ...formData, audit_status: e.target.value } as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Status</option>
                        <option value="Completed">Completed</option>
                        <option value="Not Completed">Not Completed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        placeholder="e.g. Website, Lead"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Affiliation Year</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.affiliation_year}
                        onChange={(e) => setFormData({ ...formData, affiliation_year: e.target.value })}
                        placeholder="e.g. 2020"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lead Owner</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.lead_owner}
                        onChange={(e) => setFormData({ ...formData, lead_owner: e.target.value })}
                        placeholder="Lead Owner Name"
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
                    {editingSchool ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div >
        )
      }

      {
        showDetailModal && selectedSchool && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building2 className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedSchool.name}</h3>
                    <p className="text-sm text-gray-500">Code: {selectedSchool.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 bg-gray-50 px-6">
                <button
                  onClick={() => setActiveDetailTab('details')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeDetailTab === 'details'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  School Details
                </button>
                <button
                  onClick={() => setActiveDetailTab('reports')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeDetailTab === 'reports'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Student Reports (H1)
                </button>
                <button
                  onClick={() => setShowStudentManager(true)}
                  className="ml-auto px-4 py-3 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2"
                >
                  <Users size={18} />
                  Manage Students
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeDetailTab === 'details' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Principal</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSchool.principal_name || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Affiliation Year</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {(selectedSchool as any).affiliation_date
                            ? ((selectedSchool as any).affiliation_date.length === 4 ? (selectedSchool as any).affiliation_date : new Date((selectedSchool as any).affiliation_date).getFullYear())
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Affiliation Number</p>
                        <p className="text-lg font-semibold text-gray-900">{(selectedSchool as any).affiliation_number || 'N/A'}</p>
                      </div>

                      {/* HCMS Operational Data */}
                      <div className="bg-blue-50 p-4 rounded-lg md:col-span-3">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <ClipboardCheck size={18} className="text-blue-600" />
                          Operational Status
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Book Status</p>
                            <p className={`text-sm font-medium ${(selectedSchool as any).book_status === 'Purchased' ? 'text-green-600' : 'text-gray-600'}`}>
                              {(selectedSchool as any).book_status || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Themes Status</p>
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium text-gray-900">{(selectedSchool as any).themes_status || 'N/A'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Onboarding</p>
                            <p className={`text-sm font-medium ${(selectedSchool as any).onboarding_status === 'Onboarded' ? 'text-blue-600' :
                              (selectedSchool as any).onboarding_status === 'Active' ? 'text-green-600' :
                                (selectedSchool as any).onboarding_status === 'Partial' ? 'text-orange-600' :
                                  'text-gray-600'}`}>
                              {(selectedSchool as any).onboarding_status || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Category</p>
                            <p className="text-sm font-medium text-gray-900">{(selectedSchool as any).performance_category ? `Category ${(selectedSchool as any).performance_category}` : 'N/A'}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Audit Status</p>
                            <p className={`text-sm font-medium ${(selectedSchool as any).audit_status === 'Completed' ? 'text-green-600' : 'text-gray-600'}`}>
                              {(selectedSchool as any).audit_status || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Lead Owner</p>
                            <p className="text-sm font-medium text-gray-900">{selectedSchool.lead_owner || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Source</p>
                            <p className="text-sm font-medium text-gray-900">{selectedSchool.source || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Affiliation Year</p>
                            <p className="text-sm font-medium text-gray-900">{selectedSchool.affiliation_year || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Categories</p>
                        <div className="flex gap-4">
                          <div><span className="text-xs text-gray-500">H1:</span> <span className="font-semibold">{selectedSchool.h1_count}</span></div>
                          <div><span className="text-xs text-gray-500">H2:</span> <span className="font-semibold">{selectedSchool.h2_count}</span></div>
                          <div><span className="text-xs text-gray-500">H3:</span> <span className="font-semibold">{selectedSchool.h3_count}</span></div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Contact</p>
                        <p className="text-sm font-medium text-gray-900">{selectedSchool.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-green-100 p-2 rounded">
                            <GraduationCap className="text-green-600" size={20} />
                          </div>
                          <h4 className="font-semibold text-gray-900">Teachers ({schoolTeachers.length})</h4>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                          {schoolTeachers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No teachers assigned</p>
                          ) : (
                            <div className="space-y-2">
                              {schoolTeachers.map((teacher) => (
                                <div key={teacher.id} className="bg-white p-3 rounded border border-gray-200">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-900">
                                        {teacher.first_name} {teacher.last_name}
                                      </p>
                                      <p className="text-xs text-gray-500">{teacher.subject_specialization || 'N/A'}</p>
                                      <p className="text-xs text-gray-600">{teacher.phone}</p>
                                    </div>
                                    {canManage && (
                                      <button
                                        onClick={() => openTeacherEditModal(teacher)}
                                        className="text-blue-600 hover:text-blue-800 p-1"
                                        title="Edit teacher"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-yellow-100 p-2 rounded">
                            <Users className="text-yellow-600" size={20} />
                          </div>
                          <h4 className="font-semibold text-gray-900">Mentors ({schoolMentors.length})</h4>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                          {schoolMentors.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No mentors assigned</p>
                          ) : (
                            <div className="space-y-2">
                              {schoolMentors.map((mentor) => (
                                <div key={mentor.id} className="bg-white p-3 rounded border border-gray-200">
                                  <p className="font-medium text-sm text-gray-900">
                                    {mentor.first_name} {mentor.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500">{mentor.specialization || 'N/A'}</p>
                                  <p className="text-xs text-gray-600">{mentor.phone}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-purple-100 p-2 rounded">
                          <MessageSquare className="text-purple-600" size={20} />
                        </div>
                        <h4 className="font-semibold text-gray-900">Recent Followups ({schoolFollowups.length})</h4>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {schoolFollowups.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No followup records</p>
                        ) : (
                          <div className="space-y-3">
                            {schoolFollowups.map((followup) => (
                              <div key={followup.id} className="bg-white p-3 rounded border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-medium text-sm text-gray-900">
                                    {followup.employee.full_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(followup.followup_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{followup.comments}</p>
                                {followup.next_followup_date && (
                                  <p className="text-xs text-blue-600">
                                    Next followup: {new Date(followup.next_followup_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex border-b border-gray-200">
                      {(['H1', 'H2', 'H3'] as const).map(grade => (
                        <button
                          key={grade}
                          onClick={() => setActiveReportGrade(grade)}
                          className={`px-6 py-2 text-sm font-bold transition-colors border-b-2 ${activeReportGrade === grade
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                          {grade} {grade === 'H1' ? '(Nursery)' : grade === 'H2' ? '(LKG)' : '(UKG)'}
                        </button>
                      ))}
                    </div>

                    {loadingReports ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading student reports...</span>
                      </div>
                    ) : schoolStudents.filter(s => s.grade === activeReportGrade).length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <Users size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No {activeReportGrade} students found for this school.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {schoolStudents.filter(s => s.grade === activeReportGrade).map(student => {
                          const assessments = studentAssessments.filter(a => a.student_id === student.id);
                          return (
                            <div key={student.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <div>
                                  <h4 className="font-bold text-gray-900">{student.name}</h4>
                                  <p className="text-xs text-gray-500">Phone: {student.phone}</p>
                                </div>
                                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                  {assessments.length} Assessment(s)
                                </div>
                              </div>
                              <div className="p-4">
                                {assessments.length === 0 ? (
                                  <p className="text-sm text-gray-400 italic">No assessments submitted yet.</p>
                                ) : (
                                  <div className="space-y-4">
                                    {assessments.map((assessment, assessmentIdx) => (
                                      <div key={assessmentIdx} className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-sm font-bold text-blue-800">Theme {assessment.theme_number}: {assessment.theme_name}</span>
                                          <span className="text-xs text-gray-500">{new Date(assessment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                          {Object.entries(assessment.skills).map(([skillId, val]) => (
                                            <div key={skillId} className="flex items-center gap-1.5">
                                              <div className={`w-2 h-2 rounded-full ${val === 'can' ? 'bg-green-500' :
                                                val === 'trying' ? 'bg-yellow-500' : 'bg-red-500'
                                                }`} />
                                              <span className="text-[10px] text-gray-600 truncate max-w-[100px]" title={skillId}>
                                                {val === 'can' ? 'I can' : val === 'trying' ? 'Trying' : 'Need Help'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {
        showTeacherEditModal && editingTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Edit Teacher</h3>
              <form onSubmit={handleTeacherUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={teacherFormData.first_name}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={teacherFormData.last_name}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={teacherFormData.email}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={teacherFormData.phone}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Specialization</label>
                    <input
                      type="text"
                      value={teacherFormData.subject_specialization}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, subject_specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                    <input
                      type="text"
                      value={teacherFormData.qualification}
                      onChange={(e) => setTeacherFormData({ ...teacherFormData, qualification: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    required
                    value={teacherFormData.status}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, status: e.target.value as 'active' | 'on_leave' | 'inactive' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherEditModal(false);
                      setEditingTeacher(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Teacher
                  </button>
                </div>
              </form>
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

      {/* Alumni Modal */}
      {showAlumniModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="text-blue-600" />
              Mark as Alumni
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year *</label>
                <input
                  type="text"
                  placeholder="e.g. 2024-25"
                  value={alumniYear}
                  onChange={(e) => setAlumniYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAlumniModal(false);
                    setAlumniYear('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAlumni}
                  disabled={!alumniYear}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Confirm Alumni
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStudentManager && selectedSchool && (
        <StudentManager
          schoolId={selectedSchool.id!}
          onClose={() => {
            setShowStudentManager(false);
            if (selectedSchool.id) loadSchoolReports(selectedSchool.id);
          }}
        />
      )}

      {/* In-App Notification */}
      <InAppNotification
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

