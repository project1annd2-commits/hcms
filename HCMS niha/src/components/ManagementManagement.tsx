import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { User, Permission, Management, School } from '../lib/models';
import { Collections } from '../lib/constants';
import { Shield, Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { isAsmaAyesha } from '../lib/accessControl';

interface Props {
    currentUser: User;
    currentPermissions: Permission;
}

export default function ManagementManagement({ currentUser }: Props) {
    const [members, setMembers] = useState<Management[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingMember, setEditingMember] = useState<Management | null>(null);
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        position: '', department: '', school_id: '' as string | null, hire_date: '', status: 'active' as Management['status']
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [managementData, allSchools] = await Promise.all([
                db.find<Management>(Collections.MANAGEMENT, {}),
                db.find<School>(Collections.SCHOOLS, {})
            ]);

            let schoolsData = allSchools;

            // Filter schools if not admin or Asma/Ayesha
            const isAsma = isAsmaAyesha(currentUser);
            
            if (currentUser.role !== 'admin' && !isAsma) {
                const assignments = await db.find<{ school_id: string }>(Collections.SCHOOL_ASSIGNMENTS, { 
                    employee_id: currentUser.id 
                });
                const assignedIds = assignments.map(a => a.school_id);
                schoolsData = allSchools.filter(s => assignedIds.includes(s.id!));
            }

            let finalMembers = managementData;
            if (currentUser.role !== 'admin' && !isAsma) {
                const assignedIds = schoolsData.map(s => s.id);
                finalMembers = managementData.filter(m => m.school_id && assignedIds.includes(m.school_id));
            }
 
            setMembers(finalMembers);
            setSchools(schoolsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const now = new Date().toISOString();
            if (editingMember) {
                await db.update(Collections.MANAGEMENT, editingMember.id!, { ...formData, updated_at: now });
            } else {
                await db.create(Collections.MANAGEMENT, { ...formData, created_at: now, updated_at: now });
            }
            setShowForm(false);
            setEditingMember(null);
            setFormData({ first_name: '', last_name: '', email: '', phone: '', position: '', department: '', school_id: null, hire_date: '', status: 'active' as Management['status'] });
            loadData();
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const handleEdit = (member: Management) => {
        setEditingMember(member);
        setFormData({
            first_name: member.first_name, last_name: member.last_name,
            email: member.email, phone: member.phone,
            position: member.position, department: member.department,
            hire_date: member.hire_date || '', status: member.status,
            school_id: member.school_id || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this member?')) {
            await db.delete(Collections.MANAGEMENT, id);
            loadData();
        }
    };

    const filtered = members.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Shield className="text-blue-600" size={28} />
                    <h2 className="text-2xl font-bold text-gray-800">Management Members</h2>
                </div>
                <button onClick={() => { setShowForm(true); setEditingMember(null); setFormData({ first_name: '', last_name: '', email: '', phone: '', position: '', department: '', school_id: null, hire_date: '', status: 'active' as Management['status'] }); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Plus size={18} /> Add Member
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">{editingMember ? 'Edit' : 'Add'} Management Member</h3>
                            <button onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="First Name" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="px-3 py-2 border rounded-lg" />
                                <input placeholder="Last Name" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="px-3 py-2 border rounded-lg" />
                            </div>
                            <input placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            <input placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            <input placeholder="Position" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            <input placeholder="Department" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            <select
                                value={formData.school_id || ''}
                                onChange={e => setFormData({ ...formData, school_id: e.target.value || null })}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="">Select School</option>
                                {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(member => (
                        <div key={member.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800">{member.first_name} {member.last_name}</h3>
                                    <p className="text-sm text-gray-500">{member.position}</p>
                                    <p className="text-sm text-gray-400">{member.department}</p>
                                    {member.school_id && (
                                        <p className="text-sm text-blue-600 font-medium mt-1">
                                            {schools.find(s => s.id === member.school_id)?.name}
                                        </p>
                                    )}
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{member.status}</span>
                            </div>
                            <div className="mt-3 text-sm text-gray-500">
                                <p>{member.email}</p>
                                <p>{member.phone}</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => handleEdit(member)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"><Edit size={14} /> Edit</button>
                                <button onClick={() => handleDelete(member.id!)} className="flex items-center justify-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No management members found</p>}
                </div>
            )}
        </div>
    );
}
