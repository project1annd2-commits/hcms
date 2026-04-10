import { useState, useEffect, Fragment } from 'react';
import { School, User, Permission, SchoolFollowup, SchoolAssignment } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Calendar, Clock, Plus, Building2, ArrowRight, ArrowLeft, History, Users, Search, X, MapPin, Edit2, Trash2, BarChart3, ClipboardList } from 'lucide-react';

import LoadingSpinner from './LoadingSpinner';
import SchoolFollowupAnalytics from './SchoolFollowupAnalytics';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
  initialTab?: 'hub' | 'today' | 'upcoming' | 'history' | 'daily_report' | 'analytics' | 'my-schools' | 'global' | 'add';
}

type SchoolWithFollowup = School & {
  latestFollowup?: SchoolFollowup;
  needsFollowup: boolean;
};

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SchoolFollowups({ currentUser, initialTab }: Props) {
  const [schools, setSchools] = useState<SchoolWithFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'hub' | 'today' | 'upcoming' | 'history' | 'daily_report' | 'analytics' | 'my-schools' | 'global' | 'add'>(initialTab || 'hub');
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [schoolFollowupsMap, setSchoolFollowupsMap] = useState<Map<string, SchoolFollowup[]>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [formData, setFormData] = useState({
    followup_date: getLocalDate(),
    comments: '',
    next_followup_date: '',
  });
  const [editingFollowup, setEditingFollowup] = useState<SchoolFollowup | null>(null);
  const [editFormData, setEditFormData] = useState({
    followup_date: '',
    comments: '',
    next_followup_date: '',
  });
  const [dailyFollowups, setDailyFollowups] = useState<(SchoolFollowup & { school?: School; employee?: User })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');


  const isAdmin = currentUser.role === 'admin' || 
                  currentUser.full_name?.toLowerCase().includes('anees') || 
                  currentUser.full_name?.toLowerCase().includes('annes') || 
                  currentUser.full_name?.toLowerCase().includes('unnis') || 
                  currentUser.full_name?.toLowerCase().includes('asma') ||
                  currentUser.full_name?.toLowerCase().includes('ayesha') ||
                  currentUser.username?.toLowerCase().includes('anees') ||
                  currentUser.username?.toLowerCase().includes('annes') ||
                  currentUser.username?.toLowerCase().includes('unnis') ||
                  currentUser.username?.toLowerCase().includes('asma') ||
                  currentUser.username?.toLowerCase().includes('ayesha');

  useEffect(() => {
    if (isAdmin) {
      loadEmployees();
    }
    loadData();
  }, [currentUser.id, activeTab, selectedEmployeeId]);

  const loadEmployees = async () => {
    const data = await db.find<User>(Collections.USERS, { role: 'employee', is_active: true }, { sort: { full_name: 1 } });
    if (data) {
      setEmployees(data);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setExpandedSchoolId(null);
    setSchoolFollowupsMap(new Map());

    const today = getLocalDate();
    let schoolsData: School[] = [];

    if (isAdmin) {
      // Admin: show all schools or filter by selected employee
      const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });

      if (selectedEmployeeId || activeTab === 'my-schools') {
        // Get schools assigned to selected employee or current user
        const filterEmployeeId = selectedEmployeeId || currentUser.id!;
        const assignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: filterEmployeeId });
        const assignedSchoolIds = assignments.map(a => a.school_id);
        schoolsData = allSchools.filter(s => s.id && assignedSchoolIds.includes(s.id));
      } else {
        // Show all schools
        schoolsData = allSchools;
      }
    } else {
      // Employee: show only assigned schools
      const assignedSchools = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id! });

      if (!assignedSchools || assignedSchools.length === 0) {
        setSchools([]);
        setLoading(false);
        return;
      }

      const schoolIds = assignedSchools.map(a => a.school_id);
      const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
      schoolsData = allSchools.filter(s => s.id && schoolIds.includes(s.id));
    }

    if (schoolsData.length > 0) {
      const employeeFilter = isAdmin && selectedEmployeeId ? selectedEmployeeId : currentUser.id!;

      const schoolsWithFollowups = await Promise.all(
        schoolsData.map(async (school) => {
          // For admin with no employee selected, get any followup for the school
          const filter: any = { school_id: school.id };
          if (!isAdmin || selectedEmployeeId) {
            filter.employee_id = employeeFilter;
          }

          const latestFollowupList = await db.find<SchoolFollowup>(
            Collections.SCHOOL_FOLLOWUPS,
            filter
          );

          // Sort in memory to get the true latest one
          latestFollowupList.sort((a, b) => {
            // Primary sort: Followup Date (Descending)
            const dateA = new Date(a.followup_date).getTime();
            const dateB = new Date(b.followup_date).getTime();
            if (dateB !== dateA) return dateB - dateA;

            // Secondary sort: Created At (Descending) for ties
            const createdA = new Date(a.created_at || 0).getTime();
            const createdB = new Date(b.created_at || 0).getTime();
            return createdB - createdA;
          });

          const latestFollowup = latestFollowupList[0];

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysAgoStr = getLocalDate(sevenDaysAgo);

          const isOverdueBy7Days = latestFollowup?.followup_date ? latestFollowup.followup_date < sevenDaysAgoStr : true;
          const isDueByDate = latestFollowup?.next_followup_date ? latestFollowup.next_followup_date <= today : true;

          const needsFollowup = isDueByDate || isOverdueBy7Days;

          return {
            ...school,
            latestFollowup,
            needsFollowup,
          };
        })
      );

      // Filter schools that have followups for admin "all employees" view
      let filteredSchools = schoolsWithFollowups;
      if (isAdmin && !selectedEmployeeId) {
        filteredSchools = schoolsWithFollowups.filter(s => s.latestFollowup);
      }

      if (activeTab === 'today') {
        setSchools(filteredSchools.filter(s => s.needsFollowup));
      } else if (activeTab === 'upcoming') {
        setSchools(filteredSchools.filter(s =>
          s.latestFollowup?.next_followup_date && s.latestFollowup.next_followup_date > today
        ));
      } else if (activeTab === 'add') {
        // For add tab, show all schools so they can add a followup
        setSchools(schoolsWithFollowups);
      } else {
        // For history, my-schools, global, show all schools with followups
        setSchools(filteredSchools);
      }
    } else {
      setSchools([]);
    }

    // Load Daily Report if active
    if (activeTab === 'daily_report' && isAdmin) {
      const filter: any = { followup_date: today };
      if (selectedEmployeeId) {
        filter.employee_id = selectedEmployeeId;
      }

      const followups = await db.find<SchoolFollowup>(Collections.SCHOOL_FOLLOWUPS, filter, { sort: { created_at: -1 } });

      // Enrich with school and employee details
      const enrichedFollowups = await Promise.all(followups.map(async (f) => {
        const school = await db.findById<School>(Collections.SCHOOLS, f.school_id);
        const employee = await db.findById<User>(Collections.USERS, f.employee_id);
        return { ...f, school: school || undefined, employee: employee || undefined };
      }));

      setDailyFollowups(enrichedFollowups);
    }

    // Load Analytics data
    if (activeTab === 'analytics') {
      // Logic handled by SchoolFollowupAnalytics component
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    try {
      // If no next followup date specified, default to 1 week from today
      const defaultNextFollowup = () => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 7);
        const year = nextDate.getFullYear();
        const month = String(nextDate.getMonth() + 1).padStart(2, '0');
        const day = String(nextDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      await db.insertOne(Collections.SCHOOL_FOLLOWUPS, {
        school_id: selectedSchool.id,
        employee_id: currentUser.id,
        followup_date: formData.followup_date || getLocalDate(),
        comments: formData.comments,
        next_followup_date: formData.next_followup_date || defaultNextFollowup(),
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      setShowAddModal(false);
      setSelectedSchool(null);
      setFormData({
        followup_date: getLocalDate(),
        comments: '',
        next_followup_date: '',
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating followup:', error);
      alert('Failed to create followup: ' + error.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFollowup) return;

    try {
      await db.updateById(Collections.SCHOOL_FOLLOWUPS, editingFollowup.id!, {
        followup_date: editFormData.followup_date || editingFollowup.followup_date,
        comments: editFormData.comments,
        next_followup_date: editFormData.next_followup_date || null,
        updated_at: new Date().toISOString(),
      });

      loadData(); // Refresh to update latest followup display

      // Update local state to reflect changes immediately
      const schoolId = editingFollowup.school_id;
      if (schoolFollowupsMap.has(schoolId)) {
        const updatedHistory = schoolFollowupsMap.get(schoolId)!.map(f =>
          f.id === editingFollowup.id
            ? {
              ...f,
              followup_date: editFormData.followup_date || f.followup_date,
              comments: editFormData.comments,
              next_followup_date: editFormData.next_followup_date || null
            }
            : f
        );
        const newMap = new Map(schoolFollowupsMap);
        newMap.set(schoolId, updatedHistory as SchoolFollowup[]);
        setSchoolFollowupsMap(newMap);
      }

      setEditingFollowup(null);
      setEditFormData({
        followup_date: '',
        comments: '',
        next_followup_date: '',
      });
      loadData(); // Refresh to update latest followup display
    } catch (error: any) {
      console.error('Error updating followup:', error);
      alert('Failed to update followup: ' + error.message);
    }
  };

  const handleDeleteFollowup = async (followupId: string, schoolId: string) => {
    if (!window.confirm('Are you sure you want to delete this followup record? This action cannot be undone.')) {
      return;
    }

    try {
      await db.deleteById(Collections.SCHOOL_FOLLOWUPS, followupId);

      // Update local state to remove the followup immediately
      if (schoolFollowupsMap.has(schoolId)) {
        const updatedHistory = schoolFollowupsMap.get(schoolId)!.filter(f => f.id !== followupId);
        const newMap = new Map(schoolFollowupsMap);
        newMap.set(schoolId, updatedHistory);
        setSchoolFollowupsMap(newMap);
      }

      loadData(); // Refresh to update latest followup display
    } catch (error: any) {
      console.error('Error deleting followup:', error);
      alert('Failed to delete followup: ' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };


  const loadSchoolHistory = async (schoolId: string) => {
    if (schoolFollowupsMap.has(schoolId)) {
      // Already loaded, just toggle
      setExpandedSchoolId(expandedSchoolId === schoolId ? null : schoolId);
      return;
    }

    setLoadingHistory(true);

    // Build filter for admin or employee
    const filter: any = { school_id: schoolId };
    if (!isAdmin || selectedEmployeeId) {
      filter.employee_id = selectedEmployeeId || currentUser.id;
    }

    const historyData = await db.find<SchoolFollowup>(
      Collections.SCHOOL_FOLLOWUPS,
      filter,
      { sort: { followup_date: -1 } }
    );

    if (historyData) {
      // For admin, also fetch employee names
      let enrichedHistory = historyData;
      if (isAdmin && !selectedEmployeeId) {
        enrichedHistory = await Promise.all(historyData.map(async (f) => {
          const employee = await db.findById<User>(Collections.USERS, f.employee_id);
          return { ...f, employeeName: employee?.full_name || 'Unknown' };
        }));
      }

      const newMap = new Map(schoolFollowupsMap);
      newMap.set(schoolId, enrichedHistory as SchoolFollowup[]);
      setSchoolFollowupsMap(newMap);
    }
    setExpandedSchoolId(schoolId);
    setLoadingHistory(false);
  };

  if (loading) {
    return <LoadingSpinner label="Loading Followups" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'All School Followups' : 'School Followups'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'View followups done by all employees' : 'Track and manage your school visits'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab !== 'hub' && (
        <button
          onClick={() => setActiveTab('hub')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm transition-all group"
        >
          <div className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <X size={16} />
          </div>
          Back to Hub
        </button>
      )}

      {activeTab === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={() => setActiveTab('today')}
            className="group relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 text-left overflow-hidden h-64 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock size={120} className="text-blue-600" />
            </div>
            <div className="w-16 h-16 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Clock size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Today's Visits</h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">Check schools requiring attention right now.</p>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-black text-sm uppercase tracking-widest mt-4">
                Enter Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className="group relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 text-left overflow-hidden h-64 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 size={120} className="text-indigo-600" />
            </div>
            <div className="w-16 h-16 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Building2 size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">All Schools</h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">Full directory of mapped institutions.</p>
            </div>
            <div className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest mt-4">
                Explore <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('daily_report')}
              className="group relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 text-left overflow-hidden h-64 flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ClipboardList size={120} className="text-emerald-600" />
              </div>
              <div className="w-16 h-16 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <ClipboardList size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Daily Report</h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">Summary of all activities captured today.</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-black text-sm uppercase tracking-widest mt-4">
                  Review <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          <button
            onClick={() => setActiveTab('my-schools')}
            className="group relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 text-left overflow-hidden h-64 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users size={120} className="text-amber-600" />
            </div>
            <div className="w-16 h-16 bg-amber-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Users size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">My Schools</h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">Direct access to your assigned schools.</p>
            </div>
            <div className="flex items-center gap-2 text-amber-600 font-black text-sm uppercase tracking-widest mt-4">
                Open <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className="group relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 text-left overflow-hidden h-64 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <BarChart3 size={120} className="text-purple-600" />
            </div>
            <div className="w-16 h-16 bg-purple-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-purple-200 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <BarChart3 size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">Visual insights and visit patterns.</p>
            </div>
            <div className="flex items-center gap-2 text-purple-600 font-black text-sm uppercase tracking-widest mt-4">
                View Charts <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className="group relative bg-[#0f172a] p-8 rounded-[2.5rem] shadow-sm border border-slate-800 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 text-left overflow-hidden h-64 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Plus size={120} className="text-blue-400" />
            </div>
            <div className="w-16 h-16 bg-blue-500 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-blue-900 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Plus size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-2">New Followup</h3>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">Record a new school visit entry.</p>
            </div>
            <div className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase tracking-widest mt-4">
                Start Entry <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      )}


      {/* Main Content Area - only show when not on hub */}
      {activeTab !== 'hub' && (
        <div className="space-y-6">
          <button
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold mb-4 transition-colors p-2 -ml-2 rounded-lg hover:bg-blue-50"
          >
            <ArrowLeft size={20} />
            <span className="uppercase tracking-widest text-xs">Back to Hub</span>
          </button>
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {activeTab === 'analytics' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
               <SchoolFollowupAnalytics currentUser={currentUser} />
            </div>
          ) : activeTab === 'daily_report' && isAdmin ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Today's Activity Report</h3>
                  <p className="text-sm text-gray-500">Followups performed on {new Date().toLocaleDateString()}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Total: {dailyFollowups.length}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">School</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Comments</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Next Steps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyFollowups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                          No followups found for today.
                        </td>
                      </tr>
                    ) : (
                      dailyFollowups.map((followup) => (
                        <tr key={followup.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                                {followup.employee?.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{followup.employee?.full_name}</p>
                                <p className="text-xs text-gray-500">{followup.employee?.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{followup.school?.name}</p>
                              <p className="text-xs text-gray-500">{followup.school?.code}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <p className="text-sm text-gray-700 italic">"{followup.comments}"</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {followup.next_followup_date && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                                <Calendar size={12} />
                                {formatDate(followup.next_followup_date)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">School Info</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Visit Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Latest Observation</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {schools.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                          {searchQuery ? 'No matching schools found' : activeTab === 'today' ? 'No followups needed today' : 'No schools found'}
                        </td>
                      </tr>
                    ) : (
                      schools.filter(school =>
                        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        school.code?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((school) => (
                        <Fragment key={school.id}>
                          <tr className={expandedSchoolId === school.id ? 'bg-blue-50' : 'hover:bg-gray-50 transition-colors'}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                  <Building2 size={20} />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{school.name}</h3>
                                  <p className="text-xs text-gray-500">Code: {school.code}</p>
                                  {school.address && (
                                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                                      <MapPin size={12} />
                                      <span className="truncate max-w-[150px]">{school.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <Calendar size={12} className="text-gray-400" />
                                  <span className="text-gray-600">
                                    Last: {school.latestFollowup ? formatDate(school.latestFollowup.followup_date) : 'Never'}
                                  </span>
                                </div>
                                {school.latestFollowup?.next_followup_date && (
                                  <div className={`flex items-center gap-2 text-xs font-medium ${school.needsFollowup ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                                    <Clock size={12} />
                                    {school.needsFollowup ? 'DUE NOW' : formatDate(school.latestFollowup.next_followup_date)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {school.latestFollowup?.comments ? (
                                <p className="text-xs text-gray-500 line-clamp-2 italic">
                                  "{school.latestFollowup.comments}"
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No notes.</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedSchool(school);
                                    setShowAddModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                                >
                                  <Plus size={14} />
                                  Followup
                                </button>
                                <button
                                  onClick={() => loadSchoolHistory(school.id!)}
                                  className={`p-1.5 rounded-md border transition-colors ${expandedSchoolId === school.id
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                  title="History"
                                >
                                  <History size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedSchoolId === school.id && (
                            <tr className="bg-gray-50">
                              <td colSpan={4} className="px-6 py-4">
                                <div className="space-y-4">
                                  <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Followup History</h4>
                                  {loadingHistory ? (
                                    <LoadingSpinner size="small" label="Fetching History" />
                                  ) : (schoolFollowupsMap.get(school.id!) || []).length === 0 ? (
                                    <div className="text-center py-4 text-xs text-gray-500 italic">No history found.</div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {(schoolFollowupsMap.get(school.id!) || []).map((followup) => (
                                        <div key={followup.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative group">
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                {formatDate(followup.followup_date)}
                                              </span>
                                              {isAdmin && !selectedEmployeeId && (followup as any).employeeName && (
                                                <p className="text-[10px] text-gray-500 mt-1 font-medium">By: {(followup as any).employeeName}</p>
                                              )}
                                            </div>
                                            {(followup.employee_id === currentUser.id || isAdmin) && (
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => {
                                                    setEditingFollowup(followup);
                                                    setEditFormData({
                                                      followup_date: followup.followup_date,
                                                      comments: followup.comments || '',
                                                      next_followup_date: followup.next_followup_date || '',
                                                    });
                                                  }}
                                                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                  title="Edit"
                                                >
                                                  <Edit2 size={12} />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteFollowup(followup.id!, school.id!)}
                                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                                  title="Delete"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-700 leading-relaxed italic">"{followup.comments}"</p>
                                          {followup.next_followup_date && (
                                            <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1 text-[10px] text-gray-500">
                                              <ArrowRight size={10} className="text-blue-500" />
                                              Next: {formatDate(followup.next_followup_date)}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Followup Modal */}
      {showAddModal && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">Add Followup: {selectedSchool.name}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Followup Date</label>
                <input
                  type="date"
                  value={formData.followup_date}
                  onChange={(e) => setFormData({ ...formData, followup_date: e.target.value })}
                  max={getLocalDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments / Notes *</label>
                <textarea
                  required
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={4}
                  placeholder="Enter details about your school visit..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Followup Date</label>
                <input
                  type="date"
                  value={formData.next_followup_date}
                  onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                  min={getLocalDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSchool(null);
                    setFormData({ followup_date: getLocalDate(), comments: '', next_followup_date: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Save Followup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Followup Modal */}
      {editingFollowup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">Edit Followup Record</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Followup Date</label>
                <input
                  type="date"
                  value={editFormData.followup_date}
                  onChange={(e) => setEditFormData({ ...editFormData, followup_date: e.target.value })}
                  max={getLocalDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments / Notes *</label>
                <textarea
                  required
                  value={editFormData.comments}
                  onChange={(e) => setEditFormData({ ...editFormData, comments: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Followup Date</label>
                <input
                  type="date"
                  value={editFormData.next_followup_date}
                  onChange={(e) => setEditFormData({ ...editFormData, next_followup_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFollowup(null);
                    setEditFormData({ followup_date: '', comments: '', next_followup_date: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex-1"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
