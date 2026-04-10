import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Shield, Search, Filter } from 'lucide-react';

export default function ActivityLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');

    useEffect(() => { loadLogs(); }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await db.find('activity_logs', {});
            setLogs(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const actions = [...new Set(logs.map(l => l.action).filter(Boolean))];
    const roles = [...new Set(logs.map(l => l.user_role).filter(Boolean))];

    const filtered = logs.filter(log => {
        const matchSearch = (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.action || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = roleFilter === 'all' || log.user_role === roleFilter;
        const matchAction = actionFilter === 'all' || log.action === actionFilter;
        return matchSearch && matchRole && matchAction;
    });

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Activity Logs</h2>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">{logs.length} entries</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                    <option value="all">All Roles</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                    <option value="all">All Actions</option>
                    {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">View</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filtered.slice(0, 200).map((log, idx) => (
                                    <tr key={log.id || idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.user_name || '-'}</td>
                                        <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">{log.user_role || '-'}</span></td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{log.action || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{log.view || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-400">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">No activity logs found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
