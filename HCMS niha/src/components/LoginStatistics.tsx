import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { BarChart3, Download, Calendar, User, Smartphone, Monitor, Tablet, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface LoginRecord {
    id: string;
    user_id: string;
    device_id: string;
    device_type: string;
    browser: string;
    os: string;
    last_login: string;
    login_count: number;
    created_at: string;
    user?: {
        full_name: string;
        username: string;
        role: string;
    };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function LoginStatistics() {
    const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<LoginRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedUser, setSelectedUser] = useState('all');
    const [selectedDeviceType, setSelectedDeviceType] = useState('all');
    const [stats, setStats] = useState({
        totalLogins: 0,
        uniqueDevices: 0,
        uniqueUsers: 0,
        deviceTypeBreakdown: [] as { name: string; value: number }[],
    });

    useEffect(() => {
        loadUsers();
        loadLoginData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [dateFrom, dateTo, selectedUser, selectedDeviceType, loginRecords]);

    const loadUsers = async () => {
        const data = await db.find(Collections.USERS, {}, { sort: { full_name: 1 } });
        setUsers(data);
    };

    const loadLoginData = async () => {
        setLoading(true);
        try {
            const devices = await db.find(Collections.USER_DEVICES, {}, { sort: { last_login: -1 } });
            const allUsers = await db.find(Collections.USERS, {});

            const recordsWithUser = devices.map((device: any) => ({
                ...device,
                user: allUsers.find(u => u.id === device.user_id)
            }));

            setLoginRecords(recordsWithUser);
        } catch (error) {
            console.error('Error loading login data:', error);
        }
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...loginRecords];

        // Filter by date range
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            filtered = filtered.filter(record => new Date(record.last_login) >= fromDate);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(record => new Date(record.last_login) <= toDate);
        }

        // Filter by user
        if (selectedUser !== 'all') {
            filtered = filtered.filter(record => record.user_id === selectedUser);
        }

        // Filter by device type
        if (selectedDeviceType !== 'all') {
            filtered = filtered.filter(record => record.device_type.toLowerCase() === selectedDeviceType);
        }

        setFilteredRecords(filtered);
        calculateStats(filtered);
    };

    const calculateStats = (records: LoginRecord[]) => {
        const uniqueDevices = new Set(records.map(r => r.device_id)).size;
        const uniqueUsers = new Set(records.map(r => r.user_id)).size;
        const totalLogins = records.reduce((sum, r) => sum + (r.login_count || 0), 0);

        // Device type breakdown
        const deviceCounts: { [key: string]: number } = {};
        records.forEach(record => {
            const type = record.device_type || 'unknown';
            deviceCounts[type] = (deviceCounts[type] || 0) + 1;
        });

        const deviceTypeBreakdown = Object.entries(deviceCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
        }));

        setStats({
            totalLogins,
            uniqueDevices,
            uniqueUsers,
            deviceTypeBreakdown,
        });
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Employee Name', 'Username', 'Role', 'Device Type', 'OS', 'Browser', 'Login Count', 'First Login', 'Last Login'];
        const rows = filteredRecords.map(record => [
            new Date(record.last_login).toLocaleDateString(),
            record.user?.full_name || 'Unknown',
            record.user?.username || 'N/A',
            record.user?.role || 'N/A',
            record.device_type,
            record.os,
            record.browser,
            record.login_count,
            new Date(record.created_at).toLocaleString(),
            new Date(record.last_login).toLocaleString(),
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `login-statistics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDeviceIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'mobile':
                return <Smartphone className="text-blue-600" size={16} />;
            case 'tablet':
                return <Tablet className="text-green-600" size={16} />;
            default:
                return <Monitor className="text-gray-600" size={16} />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <BarChart3 className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Login Statistics</h3>
                            <p className="text-sm text-gray-600">View and analyze employee device login activity</p>
                        </div>
                    </div>

                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={20} className="text-gray-600" />
                    <h4 className="font-semibold text-gray-900">Filters</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar size={16} className="inline mr-1" />
                            From Date
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar size={16} className="inline mr-1" />
                            To Date
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <User size={16} className="inline mr-1" />
                            Employee
                        </label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Employees</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Smartphone size={16} className="inline mr-1" />
                            Device Type
                        </label>
                        <select
                            value={selectedDeviceType}
                            onChange={(e) => setSelectedDeviceType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="mobile">Mobile</option>
                            <option value="tablet">Tablet</option>
                            <option value="desktop">Desktop</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Logins</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.totalLogins}</p>
                        </div>
                        <BarChart3 className="text-blue-400" size={40} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Unique Devices</p>
                            <p className="text-3xl font-bold text-green-600">{stats.uniqueDevices}</p>
                        </div>
                        <Smartphone className="text-green-400" size={40} />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Unique Users</p>
                            <p className="text-3xl font-bold text-purple-600">{stats.uniqueUsers}</p>
                        </div>
                        <User className="text-purple-400" size={40} />
                    </div>
                </div>
            </div>

            {/* Device Type Breakdown Chart */}
            {stats.deviceTypeBreakdown.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Device Type Distribution</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={stats.deviceTypeBreakdown}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {stats.deviceTypeBreakdown.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Login Records Table */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Login Details</h4>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="text-gray-500">Loading login data...</div>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No login records found for the selected filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Browser/OS</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Count</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRecords.map((record) => (
                                    <tr key={record.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{record.user?.full_name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{record.user?.username}</div>
                                                <div className="text-xs text-gray-400 capitalize">{record.user?.role}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getDeviceIcon(record.device_type)}
                                                <span className="text-sm text-gray-900 capitalize">{record.device_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{record.browser}</div>
                                            <div className="text-xs text-gray-500">{record.os}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">{formatDate(record.created_at)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">{formatDate(record.last_login)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-blue-600">{record.login_count}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
