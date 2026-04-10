import { useState, useEffect } from 'react';
import { School, User, Permission, SchoolAssignment } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { isAsmaAyesha } from '../lib/accessControl';
import { Plus, Search, MapPin, Building2, User as UserIcon, Phone, X, Trash2, Ban, AlertCircle, ArrowRightCircle, CheckCircle2, Edit2, Clock } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

interface Props {
    currentUser: User;
    currentPermissions: Permission;
}

export default function SchoolOnboarding({ currentUser }: Props) {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [stateFilter, setStateFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [conversionFilter, setConversionFilter] = useState<number | 'all'>('all');
    const [formData, setFormData] = useState<Partial<School>>({
        name: '',
        address: '',
        state: '',
        contact_name: '',
        contact_number: '',
        conversion_rate: 10,
        marketing_person: '',
        channel_partner: '',
        onboarding_comments: '',
        status: 'onboarding',
        village_area: '',
        town_city: '',
        district: '',
        academic_year: ''
    });
    const [showDropModal, setShowDropModal] = useState(false);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
    const [dropReason, setDropReason] = useState('');
    const [schoolAssignments, setSchoolAssignments] = useState<SchoolAssignment[]>([]);
    const [employees, setEmployees] = useState<User[]>([]);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info' } | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedSchoolForAssign, setSelectedSchoolForAssign] = useState<School | null>(null);
    const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Permission check: Admin, Rafaha, or Asma Ayesha can transfer
    const canTransfer = currentUser.role === 'admin' || currentUser.username.toLowerCase().includes('rafaha') || isAsmaAyesha(currentUser);
    const canEdit = currentUser.role === 'admin' || 
                    currentUser.role === 'employee' || 
                    currentUser.username.toLowerCase().includes('mujahid') ||
                    (currentUser.full_name || '').toLowerCase().includes('mujahid');

    // Stats calculation
    const stats = {
        total: schools.length,
        onboarded: schools.filter(s => s.conversion_rate === 100).length,
        inProgress: schools.filter(s => (s.conversion_rate || 0) < 100 && s.status === 'onboarding').length,
        dropped: schools.filter(s => s.status === 'dropped').length
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch all schools
            const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { created_at: -1 } });
            // Include 'transferred' status so they remain visible
            const onboardingSchools = allSchools.filter(s => s.status === 'onboarding' || s.status === 'dropped' || s.status === 'transferred');
            setSchools(onboardingSchools);

            // Fetch school assignments to show assigned employee
            const assignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, {});
            setSchoolAssignments(assignments);

            // Fetch employees for names
            const usersData = await db.find<User>(Collections.USERS, { role: 'employee' });
            setEmployees(usersData);
        } catch (error) {
            console.error('Error loading onboarding schools:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof School, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newSchool: Omit<School, 'id'> = {
                name: formData.name!,
                code: `LEAD-${Math.floor(Math.random() * 10000)}`, // Temporary code for leads
                address: formData.address || '',
                phone: formData.contact_number || '', // Map contact number to phone
                email: '', // Optional for lead
                h1_count: 0,
                h2_count: 0,
                h3_count: 0,
                principal_name: formData.contact_name || '', // Map contact name to principal
                state: formData.state,
                status: 'onboarding',
                contact_name: formData.contact_name,
                contact_number: formData.contact_number,
                conversion_rate: Number(formData.conversion_rate),
                marketing_person: formData.marketing_person,
                channel_partner: formData.channel_partner,
                onboarding_comments: formData.onboarding_comments,
                village_area: formData.village_area || '',
                town_city: formData.town_city || '',
                district: formData.district || '',
                academic_year: formData.academic_year || '',
                created_by: currentUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            await db.insertOne(Collections.SCHOOLS, newSchool);
            setShowAddModal(false);
            setFormData({
                name: '',
                address: '',
                state: '',
                contact_name: '',
                contact_number: '',
                conversion_rate: 10,
                marketing_person: '',
                channel_partner: '',
                onboarding_comments: '',
                status: 'onboarding',
                academic_year: ''
            });
            loadData();
            alert('School lead added successfully!');
        } catch (error: any) {
            console.error('Error adding school lead:', error);
            alert('Failed to add school lead: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Lead',
            message: 'Are you sure you want to delete this lead? This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await db.deleteById(Collections.SCHOOLS, id);
                    loadData();
                    setConfirmDialog(null);
                } catch (error) {
                    console.error('Failed to delete', error);
                }
            }
        });
    };

    const handleDrop = async () => {
        if (!selectedSchoolId || !dropReason.trim()) return;
        try {
            await db.updateById(Collections.SCHOOLS, selectedSchoolId, {
                status: 'dropped',
                dropped_reason: dropReason.trim(),
                updated_at: new Date().toISOString()
            });
            setShowDropModal(false);
            setDropReason('');
            setSelectedSchoolId(null);
            loadData();
            alert('School marked as not boarded.');
        } catch (error: any) {
            console.error('Error dropping school:', error);
            alert('Failed to drop school: ' + error.message);
        }
    };

    const handleTransfer = async (schoolId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Transfer to School Management',
            message: 'Are you sure you want to transfer this school to School Management? This will make it available for teacher and mentor assignment.',
            type: 'info',
            onConfirm: async () => {
                try {
                    // Generate proper school code
                    const newCode = `SCH-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
                    await db.updateById(Collections.SCHOOLS, schoolId, {
                        status: 'transferred',
                        code: newCode,
                        updated_at: new Date().toISOString()
                    });
                    loadData();
                    setConfirmDialog(null);
                    alert('School transferred successfully! It is now available in School Management for assignment.');
                } catch (error: any) {
                    console.error('Error transferring school:', error);
                    alert('Failed to transfer school: ' + error.message);
                }
            }
        });
    };

    const getAssignedEmployeeName = (schoolId: string): string => {
        const assignment = schoolAssignments.find(a => a.school_id === schoolId);
        if (!assignment) return 'Unassigned';
        const employee = employees.find(e => e.id === assignment.employee_id);
        return employee?.full_name || 'Unknown Employee';
    };

    const openEditModal = (school: School) => {
        setEditingSchool(school);
        setFormData({
            name: school.name,
            address: school.address || '',
            state: school.state || '',
            contact_name: school.contact_name || '',
            contact_number: school.contact_number || '',
            conversion_rate: school.conversion_rate || 10,
            marketing_person: school.marketing_person || '',
            channel_partner: school.channel_partner || '',
            onboarding_comments: school.onboarding_comments || '',
            status: school.status || 'onboarding',
            village_area: school.village_area || '',
            town_city: school.town_city || '',
            district: school.district || '',
            academic_year: school.academic_year || ''
        });
        setShowAddModal(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchool || !editingSchool.id) return;

        try {
            await db.updateById(Collections.SCHOOLS, editingSchool.id, {
                name: formData.name,
                address: formData.address,
                state: formData.state,
                contact_name: formData.contact_name,
                contact_number: formData.contact_number,
                conversion_rate: Number(formData.conversion_rate),
                marketing_person: formData.marketing_person,
                channel_partner: formData.channel_partner,
                onboarding_comments: formData.onboarding_comments,
                village_area: formData.village_area,
                town_city: formData.town_city,
                district: formData.district,
                academic_year: formData.academic_year,
                updated_at: new Date().toISOString()
            });
            setShowAddModal(false);
            setEditingSchool(null);
            setFormData({
                name: '',
                address: '',
                state: '',
                contact_name: '',
                contact_number: '',
                conversion_rate: 10,
                marketing_person: '',
                channel_partner: '',
                onboarding_comments: '',
                status: 'onboarding',
                village_area: '',
                town_city: '',
                district: '',
                academic_year: ''
            });
            loadData();
            alert('School updated successfully!');
        } catch (error: any) {
            console.error('Error updating school:', error);
            alert('Failed to update school: ' + error.message);
        }
    };

    const handleDirectAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchoolForAssign || !selectedEmployeeForAssign) return;

        setAssigning(true);
        try {
            // FIND and DELETE existing assignments for this school (Reassign logic)
            const currentAssignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { school_id: selectedSchoolForAssign.id });
            if (currentAssignments.length > 0) {
                await Promise.all(currentAssignments.map(a => db.deleteById(Collections.SCHOOL_ASSIGNMENTS, a.id!)));
            }

            // Create new assignment
            await db.insertOne(Collections.SCHOOL_ASSIGNMENTS, {
                school_id: selectedSchoolForAssign.id!,
                employee_id: selectedEmployeeForAssign,
                assigned_at: new Date().toISOString(),
            });

            setShowAssignModal(false);
            setSelectedSchoolForAssign(null);
            setSelectedEmployeeForAssign('');
            loadData();
            alert('Employee assigned successfully!');
        } catch (error: any) {
            console.error('Error assigning employee:', error);
            alert('Failed to assign: ' + error.message);
        } finally {
            setAssigning(false);
        }
    };


    const filteredSchools = schools.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.marketing_person && s.marketing_person.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.state && s.state.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesState = stateFilter === 'all' || s.state === stateFilter;
        const matchesStatus = statusFilter === 'all' || 
            (statusFilter === '2026-27' ? s.academic_year === '2026-27' : s.status === statusFilter);
        const matchesConversion = conversionFilter === 'all' || s.conversion_rate === conversionFilter;

        return matchesSearch && matchesState && matchesStatus && matchesConversion;
    });

    const getConversionColor = (rate: number) => {
        if (rate < 30) return 'bg-red-500';
        if (rate < 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">School Onboarding</h2>
                    <p className="text-gray-600 mt-1">Manage new school leads and track conversion progress</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Add Onboarding School
                    </button>
                )}
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <Building2 size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Total Leads</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-green-100 p-2 rounded-lg text-green-600">
                            <CheckCircle2 size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.onboarded}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Onboarded (100%)</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600">
                            <Clock size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.inProgress}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">In Progress</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-red-100 p-2 rounded-lg text-red-600">
                            <Ban size={24} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{stats.dropped}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Not Boarded</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={20} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by school name, state, or marketing person..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm"
                    >
                        <option value="all">All States</option>
                        {INDIAN_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="onboarding">Onboarding</option>
                        <option value="transferred">Transferred</option>
                        <option value="dropped">Not Boarded</option>
                        <option value="2026-27">List 1: 2026-27</option>
                    </select>

                    <select
                        value={conversionFilter}
                        onChange={(e) => setConversionFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm"
                    >
                        <option value="all">All Conversions</option>
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                        <option value="30">30%</option>
                        <option value="40">40%</option>
                        <option value="50">50%</option>
                        <option value="60">60%</option>
                        <option value="70">70%</option>
                        <option value="80">80%</option>
                        <option value="90">90%</option>
                        <option value="100">100%</option>
                    </select>

                    {(searchQuery || stateFilter !== 'all' || statusFilter !== 'all' || conversionFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStateFilter('all');
                                setStatusFilter('all');
                                setConversionFilter('all');
                            }}
                            className="px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading leads...</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">School Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Person</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Marketing Ref</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Conversion Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSchools.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                            No onboarding schools found. Add one to get started!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSchools.map((school) => (
                                        <tr key={school.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{school.name}</p>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                            <MapPin size={12} />
                                                            {school.address || 'No address'}, {school.state || 'No State'}
                                                        </div>
                                                        {school.status === 'dropped' && school.dropped_reason && (
                                                            <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-100">
                                                                <p className="text-xs font-bold text-orange-800 flex items-center gap-1 mb-1">
                                                                    <AlertCircle size={12} />
                                                                    Reason for Not Boarding:
                                                                </p>
                                                                <p className="text-xs text-orange-700 italic">"{school.dropped_reason}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900 flex items-center gap-2">
                                                        <UserIcon size={14} className="text-gray-400" />
                                                        {school.contact_name || 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                        <Phone size={12} />
                                                        {school.contact_number || 'N/A'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    {school.marketing_person || 'Direct'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 w-1/4">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs font-medium text-gray-700">
                                                        <span>Probability</span>
                                                        <span>{school.conversion_rate}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className={`h-2.5 rounded-full transition-all duration-500 ${getConversionColor(school.conversion_rate || 0)}`}
                                                            style={{ width: `${school.conversion_rate}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 flex-wrap">
                                                    {/* Transferred Status Badge */}
                                                    {school.status === 'transferred' && (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                                                                <CheckCircle2 size={14} />
                                                                Transferred
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                <span className="font-medium">Assigned: </span>
                                                                <span className={getAssignedEmployeeName(school.id!) === 'Unassigned' ? 'text-orange-500' : 'text-blue-600'}>
                                                                    {getAssignedEmployeeName(school.id!)}
                                                                </span>
                                                                {canTransfer && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedSchoolForAssign(school);
                                                                            const currentAssignment = schoolAssignments.find(a => a.school_id === school.id);
                                                                            setSelectedEmployeeForAssign(currentAssignment?.employee_id || '');
                                                                            setShowAssignModal(true);
                                                                        }}
                                                                        className="ml-2 text-blue-600 hover:text-blue-800 underline font-medium"
                                                                    >
                                                                        {getAssignedEmployeeName(school.id!) === 'Unassigned' ? 'Assign' : 'Change'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Transfer Button for 100% conversion */}
                                                    {school.status === 'onboarding' && school.conversion_rate === 100 && canTransfer && (
                                                        <button
                                                            onClick={() => handleTransfer(school.id!)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium shadow-sm"
                                                            title="Transfer to School Management"
                                                        >
                                                            <ArrowRightCircle size={14} />
                                                            Transfer
                                                        </button>
                                                    )}

                                                    {/* Onboarding Actions */}
                                                    {(school.status === 'onboarding' || school.status === 'dropped') && canEdit && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(school)}
                                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Edit School"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSchoolId(school.id!);
                                                                    setShowDropModal(true);
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Mark as Not Boarded"
                                                            >
                                                                <Ban size={16} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Dropped Badge */}
                                                    {school.status === 'dropped' && (
                                                        <div
                                                            className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs"
                                                            title={school.dropped_reason}
                                                        >
                                                            <AlertCircle size={14} />
                                                            Not Boarded
                                                        </div>
                                                    )}

                                                    {/* Delete Button */}
                                                    {currentUser.role === 'admin' && (
                                                        <button
                                                            onClick={() => handleDelete(school.id!)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Delete Lead"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                {school.status === 'dropped' && school.dropped_reason && (
                                                    <p className="text-[10px] text-orange-500 mt-1 italic max-w-[150px] ml-auto truncate" title={school.dropped_reason}>
                                                        {school.dropped_reason}
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">{editingSchool ? 'Edit School Lead' : 'Add New School Lead'}</h3>
                            <button onClick={() => { setShowAddModal(false); setEditingSchool(null); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={editingSchool ? handleEditSubmit : handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="e.g. Greenwood High"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                        value={formData.state}
                                        onChange={(e) => handleInputChange('state', e.target.value)}
                                    >
                                        <option value="">Select State</option>
                                        {INDIAN_STATES.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={formData.district}
                                        onChange={(e) => handleInputChange('district', e.target.value)}
                                        placeholder="e.g. Hyderabad"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Town/City</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={formData.town_city}
                                        onChange={(e) => handleInputChange('town_city', e.target.value)}
                                        placeholder="e.g. Jubilee Hills"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Village/Area</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={formData.village_area}
                                        onChange={(e) => handleInputChange('village_area', e.target.value)}
                                        placeholder="e.g. Road No. 10"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Marketing Person</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={formData.marketing_person}
                                        onChange={(e) => handleInputChange('marketing_person', e.target.value)}
                                        placeholder="Referral Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel Partner</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={formData.channel_partner || ''}
                                        onChange={(e) => handleInputChange('channel_partner', e.target.value)}
                                        placeholder="Partner Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    rows={2}
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    placeholder="Full address..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={formData.contact_name}
                                        onChange={(e) => handleInputChange('contact_name', e.target.value)}
                                        placeholder="Principal/Admin"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={formData.contact_number}
                                        onChange={(e) => handleInputChange('contact_number', e.target.value)}
                                        placeholder="+91..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Conversion Probability: <span className="text-blue-600 font-bold">{formData.conversion_rate}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="10"
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    value={formData.conversion_rate}
                                    onChange={(e) => handleInputChange('conversion_rate', Number(e.target.value))}
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>Low (10%)</span>
                                    <span>High (100%)</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Onboarding Comments</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    rows={3}
                                    value={formData.onboarding_comments || ''}
                                    onChange={(e) => handleInputChange('onboarding_comments', e.target.value)}
                                    placeholder="Any additional notes or specific context for this lead..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                    value={formData.academic_year || ''}
                                    onChange={(e) => handleInputChange('academic_year', e.target.value)}
                                >
                                    <option value="">Select Academic Year</option>
                                    <option value="2026-27">2026-27</option>
                                    <option value="2025-26">2025-26</option>
                                    <option value="2024-25">2024-25</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setEditingSchool(null); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
                                >
                                    {editingSchool ? 'Update Lead' : 'Create Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Direct Assign Modal */}
            {showAssignModal && selectedSchoolForAssign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">
                                {getAssignedEmployeeName(selectedSchoolForAssign.id!) === 'Unassigned' ? 'Assign Employee' : 'Reassign Employee'}
                            </h3>
                            <button onClick={() => { setShowAssignModal(false); setSelectedSchoolForAssign(null); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleDirectAssign} className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    School: <span className="font-bold text-gray-900">{selectedSchoolForAssign.name}</span>
                                </p>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee (SPOC)</label>
                                <select
                                    required
                                    value={selectedEmployeeForAssign}
                                    onChange={(e) => setSelectedEmployeeForAssign(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                >
                                    <option value="">Select an employee</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.username})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowAssignModal(false); setSelectedSchoolForAssign(null); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigning || !selectedEmployeeForAssign}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                                >
                                    {assigning ? 'Assigning...' : 'Confirm Assignment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Drop Reason Modal (existing) */}
            {showDropModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Mark School as Not Boarded</h3>
                            <button onClick={() => { setShowDropModal(false); setSelectedSchoolId(null); setDropReason(''); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Not Boarding *</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    rows={4}
                                    placeholder="Please explain why this school is being marked as dropped..."
                                    value={dropReason}
                                    onChange={(e) => setDropReason(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowDropModal(false); setSelectedSchoolId(null); setDropReason(''); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDrop}
                                    disabled={!dropReason.trim()}
                                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg font-medium shadow-sm"
                                >
                                    Mark as Not Boarded
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Dialog */}
            {confirmDialog && (
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    type={confirmDialog.type}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div>
    );
}
