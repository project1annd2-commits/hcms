import { useState, useEffect, Fragment } from 'react';
import { User, Permission, SchoolQuery, School } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Search, X, Edit2, Trash2, Building2, MessageSquare, History, Users, Briefcase, Clock } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface Props {
    currentUser: User;
    currentPermissions: Permission;
}

type SchoolWithQuery = School & {
    latestQuery?: SchoolQuery;
    hasPendingQuery: boolean;
};

const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function QueryTracker({ currentUser }: Props) {
    const [schools, setSchools] = useState<SchoolWithQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'today'>('all');
    const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
    const [schoolQueriesMap, setSchoolQueriesMap] = useState<Map<string, SchoolQuery[]>>(new Map());
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [employees, setEmployees] = useState<User[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    const [formData, setFormData] = useState<Partial<SchoolQuery>>({
        school_id: '',
        school_name: '',
        person_name: '',
        person_designation: '',
        received_date: getLocalDate(),
        resolved_by: '',
        resolved_date: '',
        source: 'call',
        department: '',
        query: '',
        resolution: '',
        status: 'pending',
    });

    const [editingQuery, setEditingQuery] = useState<SchoolQuery | null>(null);

    const isAdmin = currentUser.role === 'admin';

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
        setSchoolQueriesMap(new Map());

        const today = getLocalDate();
        let schoolsData: School[] = [];

        if (isAdmin) {
            const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
            if (selectedEmployeeId) {
                const assignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: selectedEmployeeId });
                const assignedSchoolIds = assignments.map(a => a.school_id);
                schoolsData = allSchools.filter(s => assignedSchoolIds.includes(s.id));
            } else {
                schoolsData = allSchools;
            }
        } else {
            const assignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
            if (!assignments || assignments.length === 0) {
                setSchools([]);
                setLoading(false);
                return;
            }
            const schoolIds = assignments.map(a => a.school_id);
            const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
            schoolsData = allSchools.filter(s => schoolIds.includes(s.id));
        }

        if (schoolsData.length > 0) {
            const schoolsWithQueries = await Promise.all(
                schoolsData.map(async (school) => {
                    const filter: any = { school_id: school.id };
                    const queryList = await db.find<SchoolQuery>(Collections.SCHOOL_QUERIES, filter);

                    // Sort to find the latest
                    queryList.sort((a, b) => {
                        const dateA = new Date(a.received_date).getTime();
                        const dateB = new Date(b.received_date).getTime();
                        if (dateB !== dateA) return dateB - dateA;
                        const createdA = new Date(a.created_at || 0).getTime();
                        const createdB = new Date(b.created_at || 0).getTime();
                        return createdB - createdA;
                    });

                    const latestQuery = queryList[0];
                    const hasPendingQuery = queryList.some(q => q.status !== 'resolved');

                    return {
                        ...school,
                        latestQuery,
                        hasPendingQuery,
                    };
                })
            );

            let filtered = schoolsWithQueries;
            if (activeTab === 'today') {
                filtered = schoolsWithQueries.filter(s => s.latestQuery?.received_date === today);
            } else if (isAdmin && !selectedEmployeeId) {
                // Admin "All" view: show schools that have at least one query
                filtered = schoolsWithQueries.filter(s => s.latestQuery);
            }

            setSchools(filtered);
        } else {
            setSchools([]);
        }

        setLoading(false);
    };

    const loadSchoolHistory = async (schoolId: string) => {
        if (schoolQueriesMap.has(schoolId)) {
            setExpandedSchoolId(expandedSchoolId === schoolId ? null : schoolId);
            return;
        }

        setLoadingHistory(true);
        const filter: any = { school_id: schoolId };
        const historyData = await db.find<SchoolQuery>(
            Collections.SCHOOL_QUERIES,
            filter,
            { sort: { received_date: -1 } }
        );

        if (historyData) {
            const newMap = new Map(schoolQueriesMap);
            newMap.set(schoolId, historyData);
            setSchoolQueriesMap(newMap);
        }
        setExpandedSchoolId(schoolId);
        setLoadingHistory(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchool) return;

        try {
            await db.insertOne(Collections.SCHOOL_QUERIES, {
                ...formData,
                school_id: selectedSchool.id,
                school_name: selectedSchool.name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            setShowAddModal(false);
            setSelectedSchool(null);
            resetForm();
            loadData();
        } catch (error: any) {
            console.error('Error creating query:', error);
            alert('Failed to create query: ' + error.message);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingQuery) return;

        try {
            await db.updateById(Collections.SCHOOL_QUERIES, editingQuery.id!, {
                ...formData,
                updated_at: new Date().toISOString(),
            });

            setEditingQuery(null);
            setShowAddModal(false);
            resetForm();
            loadData();
        } catch (error: any) {
            console.error('Error updating query:', error);
            alert('Failed to update query: ' + error.message);
        }
    };

    const handleDelete = async (id: string, schoolId: string) => {
        if (!window.confirm('Are you sure you want to delete this query?')) return;
        try {
            await db.deleteById(Collections.SCHOOL_QUERIES, id);

            // Update local map if expanded
            if (schoolQueriesMap.has(schoolId)) {
                const updated = schoolQueriesMap.get(schoolId)!.filter(q => q.id !== id);
                const newMap = new Map(schoolQueriesMap);
                newMap.set(schoolId, updated);
                setSchoolQueriesMap(newMap);
            }

            loadData();
        } catch (error: any) {
            console.error('Error deleting query:', error);
            alert('Failed to delete query: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            school_id: '',
            school_name: '',
            person_name: '',
            person_designation: '',
            received_date: getLocalDate(),
            resolved_by: '',
            resolved_date: '',
            source: 'call',
            department: '',
            query: '',
            resolution: '',
            status: 'pending',
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const filteredSchools = schools.filter(school =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <LoadingSpinner label="Loading Queries" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Query Tracker</h2>
                    <p className="text-gray-600 mt-1">
                        {isAdmin ? 'View and manage school queries globally' : 'Manage queries for your assigned schools'}
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-gray-500" />
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                        >
                            <option value="">All Employees</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'all'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    All Schools
                </button>
                <button
                    onClick={() => setActiveTab('today')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'today'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Today's Queries
                </button>
            </div>

            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border-2 border-blue-200 shadow-lg">
                <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
                    <Search size={20} className="text-blue-500" />
                </div>
                <input
                    type="text"
                    placeholder="🔍 Search schools by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 text-base bg-white shadow-inner font-medium"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-7 flex items-center text-gray-400 hover:text-red-500"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">School Info</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Latest Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Latest Query</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSchools.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                                                <MessageSquare className="text-blue-500" size={32} />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No queries found</h3>
                                            <p className="text-gray-500 text-sm">Try a different search term or check another tab.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSchools.map((school) => (
                                    <Fragment key={school.id}>
                                        <tr className={`group hover:bg-blue-50/30 transition-colors duration-200 ${expandedSchoolId === school.id ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-blue-100 shrink-0">
                                                        <Building2 className="text-blue-600" size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{school.name}</h3>
                                                        <p className="text-gray-500 text-[10px] mt-0.5 font-bold uppercase tracking-wider">Code: {school.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {school.latestQuery ? (
                                                    <div className="space-y-1.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                                                            ${school.latestQuery.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                                school.latestQuery.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800 animate-pulse'}`}>
                                                            {school.latestQuery.status?.replace('_', ' ') || 'pending'}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(school.latestQuery.received_date)}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-300 font-bold uppercase italic">No Queries Yet</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs">
                                                    {school.latestQuery ? (
                                                        <div className="p-2 bg-gray-50 border border-gray-100 rounded-lg">
                                                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed italic">
                                                                "{school.latestQuery.query}"
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 italic">No notes recorded.</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSchool(school);
                                                            resetForm();
                                                            setShowAddModal(true);
                                                        }}
                                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                                                    >
                                                        <Plus size={14} className="font-bold" />
                                                        <span className="text-[11px] font-black uppercase tracking-wider">Add Query</span>
                                                    </button>
                                                    <button
                                                        onClick={() => loadSchoolHistory(school.id!)}
                                                        className={`p-2 rounded-lg border transition-all duration-200 ${expandedSchoolId === school.id
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                            : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600'
                                                            }`}
                                                        title="View History"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedSchoolId === school.id && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={4} className="px-6 py-0">
                                                    <div className="py-6 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                                        {/* Assuming 'uploading' state is managed elsewhere for this spinner */}
                                                        {/* {uploading && (
                                                            <LoadingSpinner label="Processing Records" />
                                                        )} */}
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                                                <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Query Timeline</h4>
                                                            </div>
                                                            <div className="h-px flex-1 mx-6 bg-gray-200"></div>
                                                        </div>

                                                        {loadingHistory ? (
                                                            <div className="flex flex-col items-center py-12">
                                                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                                                <p className="text-gray-400 text-[10px] font-black tracking-widest uppercase">Fetching Logs...</p>
                                                            </div>
                                                        ) : (schoolQueriesMap.get(school.id!) || []).length === 0 ? (
                                                            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                                                                <p className="text-gray-400 text-xs font-medium italic">No historical queries found.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {(schoolQueriesMap.get(school.id!) || []).map((query, index) => (
                                                                    <div key={query.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group/item">
                                                                        <div className="flex items-start justify-between mb-3">
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full w-fit ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                                                    {formatDate(query.received_date).toUpperCase()}
                                                                                </span>
                                                                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm w-fit ${query.status === 'resolved' ? 'bg-green-50 text-green-600' :
                                                                                    query.status === 'in_progress' ? 'bg-yellow-50 text-yellow-600' :
                                                                                        'bg-red-50 text-red-600'
                                                                                    }`}>
                                                                                    {query.status?.replace('_', ' ') || 'pending'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setEditingQuery(query);
                                                                                        setFormData(query);
                                                                                        setSelectedSchool(school);
                                                                                        setShowAddModal(true);
                                                                                    }}
                                                                                    className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                                                >
                                                                                    <Edit2 size={12} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDelete(query.id!, school.id!)}
                                                                                    className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            <div>
                                                                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Query</p>
                                                                                <p className="text-xs text-gray-800 font-medium leading-relaxed italic">"{query.query}"</p>
                                                                            </div>

                                                                            {query.resolution && (
                                                                                <div>
                                                                                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Resolution</p>
                                                                                    <p className="text-xs text-green-700 font-medium leading-relaxed">{query.resolution}</p>
                                                                                </div>
                                                                            )}

                                                                            <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] text-gray-400 font-bold uppercase">
                                                                                <span className="flex items-center gap-1"><Users size={10} /> {query.person_name}</span>
                                                                                <span className="flex items-center gap-1"><Clock size={10} /> {query.source}</span>
                                                                            </div>
                                                                        </div>
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

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingQuery ? 'Edit School Query' : `Add Query for ${selectedSchool?.name}`}
                            </h3>
                            <button onClick={() => { setShowAddModal(false); setEditingQuery(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={editingQuery ? handleEditSubmit : handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Building2 size={18} className="text-blue-500" /> Contact Information
                                </h4>

                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Person Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.person_name}
                                                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                                placeholder="e.g. Mrs. Smith"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Designation</label>
                                            <input
                                                type="text"
                                                value={formData.person_designation}
                                                onChange={(e) => setFormData({ ...formData, person_designation: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                placeholder="e.g. Principal"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Source</label>
                                            <select
                                                value={formData.source}
                                                onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                            >
                                                <option value="call">Call</option>
                                                <option value="whatsapp">WhatsApp</option>
                                                <option value="email">Email</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Received Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.received_date}
                                                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <MessageSquare size={18} className="text-blue-500" /> Query Details
                                </h4>

                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Department</label>
                                        <input
                                            type="text"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                            placeholder="e.g. Admin, Academics"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Query Description *</label>
                                        <textarea
                                            required
                                            value={formData.query}
                                            onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                            placeholder="Describe the query in detail..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4 pt-4 border-t">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Briefcase size={18} className="text-blue-500" /> Resolution & Status
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase mb-1">Resolution Note</label>
                                        <textarea
                                            value={formData.resolution}
                                            onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                            placeholder="Enter resolution details if resolved..."
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Status</label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 ${formData.status === 'resolved' ? 'border-green-300 text-green-700' :
                                                        formData.status === 'in_progress' ? 'border-yellow-300 text-yellow-700' :
                                                            'border-red-300 text-red-700'
                                                        }`}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="resolved">Resolved</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Resolved By</label>
                                                <input
                                                    type="text"
                                                    value={formData.resolved_by}
                                                    onChange={(e) => setFormData({ ...formData, resolved_by: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    placeholder="Name"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase mb-1">Date Resolved</label>
                                            <input
                                                type="date"
                                                value={formData.resolved_date}
                                                onChange={(e) => setFormData({ ...formData, resolved_date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setEditingQuery(null); resetForm(); }}
                                    className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-sm font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200"
                                >
                                    {editingQuery ? 'Update Query' : 'Save Query'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

