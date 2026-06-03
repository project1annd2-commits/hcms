import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { User } from '../lib/models';
import { Shield, Search, Calendar, Filter } from 'lucide-react';

interface Props {
    currentUser: User;
}

export default function AuditManagement({ currentUser }: Props) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await db.find('activity_logs', {});
            setLogs(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Audit Management</h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search audit logs..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">No audit logs found</td>
                                </tr>
                            ) : (
                                filteredLogs.slice(0, 100).map((log, idx) => (
                                    <tr key={log.id || idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{log.user_name || 'Unknown'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{log.action || '-'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">{log.user_role || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
