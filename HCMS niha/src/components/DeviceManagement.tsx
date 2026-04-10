import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Smartphone, Monitor, Tablet, Shield, ShieldOff, Clock, RefreshCw, AlertCircle, Wifi } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_model: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  is_blocked: boolean;
  is_approved: boolean;
  first_login: string;
  last_login: string;
  created_at: string;
  last_location: string | null;
  user?: {
    full_name: string;
    username: string;
    role: string;
  };
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    blocked: 0,
    online: 0,
    employeesOnline: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  useEffect(() => {
    loadUsers();
    loadDevices();
  }, []);

  useEffect(() => {
    loadDevices();
  }, [filterUser, filterStatus]);

  const loadUsers = async () => {
    const data = await db.find(Collections.USERS, {}, { sort: { full_name: 1 } });
    setUsers(data.map(u => ({ id: u.id, full_name: u.full_name, username: u.username, role: u.role })));
  };

  const loadDevices = async () => {
    setLoading(true);

    try {
      // Build filter
      let filter: any = {};
      if (filterUser !== 'all') {
        filter.user_id = filterUser;
      }
      if (filterStatus === 'blocked') {
        filter.is_blocked = true;
      } else if (filterStatus === 'active') {
        filter.is_blocked = false;
        filter.is_approved = true;
      } else if (filterStatus === 'pending') {
        filter.is_approved = false;
        filter.is_blocked = false;
      }

      const devicesData = await db.find(Collections.USER_DEVICES, filter, { sort: { last_login: -1 } });

      // Load users for devices
      const allUsers = await db.find(Collections.USERS, {});

      const devicesWithUser = devicesData.map((device: any) => ({
        ...device,
        user: allUsers.find(u => u.id === device.user_id)
      }));

      setDevices(devicesWithUser);

      // Calculate statistics
      const allDevicesData = await db.find(Collections.USER_DEVICES, {});
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

      // Get employee user IDs
      const employeeUserIds = allUsers.filter((u: any) => u.role === 'employee').map((u: any) => u.id);

      setStats({
        total: allDevicesData.length,
        pending: allDevicesData.filter((d: any) => !d.is_approved && !d.is_blocked).length,
        active: allDevicesData.filter((d: any) => d.is_approved && !d.is_blocked).length,
        blocked: allDevicesData.filter((d: any) => d.is_blocked).length,
        online: allDevicesData.filter((d: any) => d.last_login && new Date(d.last_login).getTime() > fifteenMinutesAgo).length,
        employeesOnline: allDevicesData.filter((d: any) =>
          d.last_login &&
          new Date(d.last_login).getTime() > fifteenMinutesAgo &&
          employeeUserIds.includes(d.user_id)
        ).length,
      });
    } catch (error) {
      console.error('Error loading devices:', error);
    }

    setLoading(false);
  };

  const handleApproveDevice = (device: Device) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Device',
      message: `Are you sure you want to approve this device for ${device.user?.full_name}? They will be able to login from this device.`,
      onConfirm: async () => {
        await approveDevice(device.id);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleRejectDevice = (device: Device) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reject Device',
      message: `Are you sure you want to reject this device? It will be blocked and ${device.user?.full_name} will not be able to use it.`,
      onConfirm: async () => {
        await rejectDevice(device.id);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleBlockDevice = (device: Device) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Block Device',
      message: `Are you sure you want to block this device? ${device.user?.full_name} will not be able to login from this device until it is unblocked.`,
      onConfirm: async () => {
        await toggleDeviceStatus(device.id, true);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleUnblockDevice = (device: Device) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unblock Device',
      message: `Are you sure you want to unblock this device? ${device.user?.full_name} will be able to login from this device.`,
      onConfirm: async () => {
        await toggleDeviceStatus(device.id, false);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const approveDevice = async (deviceId: string) => {
    try {
      await db.updateById(Collections.USER_DEVICES, deviceId, {
        is_approved: true,
        updated_at: new Date().toISOString()
      });
      loadDevices();
    } catch (error) {
      console.error('Error approving device:', error);
    }
  };

  const rejectDevice = async (deviceId: string) => {
    try {
      await db.updateById(Collections.USER_DEVICES, deviceId, {
        is_blocked: true,
        updated_at: new Date().toISOString()
      });
      loadDevices();
    } catch (error) {
      console.error('Error rejecting device:', error);
    }
  };

  const toggleDeviceStatus = async (deviceId: string, blocked: boolean) => {
    try {
      await db.updateById(Collections.USER_DEVICES, deviceId, {
        is_blocked: blocked,
        updated_at: new Date().toISOString()
      });
      loadDevices();
    } catch (error) {
      console.error('Error updating device status:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="text-blue-600" size={20} />;
      case 'tablet':
        return <Tablet className="text-green-600" size={20} />;
      default:
        return <Monitor className="text-gray-600" size={20} />;
    }
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

  const isOnline = (lastLogin: string) => {
    if (!lastLogin) return false;
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    return new Date(lastLogin).getTime() > fifteenMinutesAgo;
  };

  const getRelativeTime = (dateString: string) => {
    if (!dateString) return 'Never';
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Shield className="text-gray-400" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <AlertCircle className="text-yellow-400" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Online Now</p>
              <p className="text-2xl font-bold text-green-600">{stats.online}</p>
            </div>
            <Wifi className="text-green-400" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Blocked Devices</p>
              <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
            </div>
            <ShieldOff className="text-red-400" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold">Employees Online</p>
              <p className="text-2xl font-bold text-blue-600">{stats.employeesOnline}</p>
            </div>
            <div className="relative">
              <Monitor className="text-blue-400" size={32} />
              {stats.employeesOnline > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Shield className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Device Management</h3>
              <p className="text-sm text-gray-600">Monitor and control employee device access</p>
            </div>
          </div>

          <button
            onClick={loadDevices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by User</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Devices</option>
              <option value="pending">Pending Approval</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading devices...</div>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p>No devices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Online</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Browser/OS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => {
                  const isPending = !device.is_approved && !device.is_blocked;
                  const isBlocked = device.is_blocked;
                  const rowClass = isPending ? 'bg-yellow-50' : isBlocked ? 'bg-red-50' : '';

                  return (
                    <tr key={device.id} className={rowClass}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{device.user?.full_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{device.user?.username}</div>
                          <div className="text-xs text-gray-400 capitalize">{device.user?.role}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isOnline(device.last_login) ? (
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium text-green-600">Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex rounded-full h-3 w-3 bg-gray-300"></span>
                            <span className="text-sm text-gray-500">Offline</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.device_type)}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{device.device_model}</div>
                            <div className="text-xs text-gray-500 capitalize">{device.device_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{device.browser}</div>
                        <div className="text-xs text-gray-500">{device.os}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock size={14} />
                          <span>{getRelativeTime(device.last_login)}</span>
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(device.last_login)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <AlertCircle size={14} />
                            Pending
                          </span>
                        ) : isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            <ShieldOff size={14} />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <Shield size={14} />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApproveDevice(device)}
                                className="text-green-600 hover:text-green-800 font-medium text-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectDevice(device)}
                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                              >
                                Reject
                              </button>
                            </>
                          ) : isBlocked ? (
                            <button
                              onClick={() => handleUnblockDevice(device)}
                              className="text-green-600 hover:text-green-800 font-medium text-sm"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockDevice(device)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
