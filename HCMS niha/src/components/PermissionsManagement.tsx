import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { User, Permission } from '../lib/models';
import { Lock, Save, Search } from 'lucide-react';

const PERMISSION_FIELDS = [
    { key: 'can_delete_schools', label: 'Delete Schools' },
    { key: 'can_manage_users', label: 'Manage Users' },
    { key: 'can_assign_training', label: 'Assign Training' },
    { key: 'can_view_reports', label: 'View Reports' },
    { key: 'can_manage_schools', label: 'Manage Schools' },
    { key: 'can_manage_teachers', label: 'Manage Teachers' },
    { key: 'can_manage_mentors', label: 'Manage Mentors' },
    { key: 'can_manage_admin_personnel', label: 'Manage Admin Personnel' },
    { key: 'can_manage_training_programs', label: 'Manage Training Programs' },
];

export function PermissionsManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, permsData] = await Promise.all([
                db.find<User>(Collections.USERS, {}),
                db.find<Permission>(Collections.PERMISSIONS, {})
            ]);
            setUsers(usersData.filter(u => u.is_active));
            setPermissions(permsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPermission = (userId: string) => permissions.find(p => p.user_id === userId);

    const togglePermission = async (userId: string, field: string) => {
        setSaving(userId);
        try {
            const existing = permissions.find(p => p.user_id === userId);
            if (existing) {
                const updated = { ...existing, [field]: !(existing as any)[field] };
                await db.update(Collections.PERMISSIONS, existing.id!, updated);
            } else {
                const newPerm: any = { user_id: userId };
                PERMISSION_FIELDS.forEach(f => { newPerm[f.key] = f.key === field; });
                await db.create(Collections.PERMISSIONS, newPerm);
            }
            loadData();
        } catch (error) {
            console.error('Error updating permission:', error);
        } finally {
            setSaving(null);
        }
    };

    const filtered = users.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <Lock className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Permissions Management</h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                                    {PERMISSION_FIELDS.map(f => (
                                        <th key={f.key} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{f.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.map(user => {
                                    const perm = getPermission(user.id!);
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800 sticky left-0 bg-white">{user.full_name}</td>
                                            <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">{user.role}</span></td>
                                            {PERMISSION_FIELDS.map(f => (
                                                <td key={f.key} className="px-3 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={(perm as any)?.[f.key] || false}
                                                        onChange={() => togglePermission(user.id!, f.key)}
                                                        disabled={saving === user.id}
                                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
