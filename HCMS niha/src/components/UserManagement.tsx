import { useState, useEffect } from 'react';
import { User, Permission } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { generateUsername, generatePassword, hashPassword } from '../lib/auth';
import { Plus, Edit2, Trash2, Key, Shield, RefreshCw } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

type UserWithPermissions = User & { permissions?: Permission | null };

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

export default function UserManagement({ currentUser, currentPermissions }: Props) {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [regeneratedCredentials, setRegeneratedCredentials] = useState<{ username: string; password: string } | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    role: 'viewer' as 'admin' | 'employee' | 'viewer',
  });

  const [permissionsData, setPermissionsData] = useState<Partial<Permission>>({
    can_delete_schools: false,
    can_manage_users: false,
    can_assign_training: false,
    can_view_reports: false,
    can_manage_schools: false,
    can_manage_teachers: false,
    can_manage_mentors: false,
    can_manage_admin_personnel: false,
    can_manage_training_programs: false,
  });

  const canManage = currentPermissions.can_manage_users || currentUser.role === 'admin';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await db.find<User>(Collections.USERS, {}, { sort: { created_at: -1 } });

      // Load permissions for each user
      const usersWithPermissions = await Promise.all(
        usersData.map(async (user) => {
          const permissions = await db.findOne<Permission>(Collections.PERMISSIONS, { user_id: user.id });
          return { ...user, permissions };
        })
      );

      setUsers(usersWithPermissions);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const username = generateUsername(formData.full_name);
    const password = generatePassword();
    const passwordHash = await hashPassword(password);

    if (editingUser) {
      await db.updateById<User>(
        Collections.USERS,
        editingUser.id!,
        {
          full_name: formData.full_name,
          role: formData.role,
        }
      );
    } else {
      const newUser = await db.insertOne<User>(Collections.USERS, {
        username,
        password_hash: passwordHash,
        full_name: formData.full_name,
        role: formData.role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      if (newUser && newUser.id) {
        await db.insertOne<Permission>(Collections.PERMISSIONS, {
          user_id: newUser.id,
          ...permissionsData,
        } as any);

        setGeneratedCredentials({ username, password });
      }
    }

    loadUsers();
    if (!generatedCredentials) {
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deactivate User',
      message: 'Are you sure you want to deactivate this user? They will no longer be able to log in, but their history will be preserved.',
      onConfirm: async () => {
        await db.updateById(Collections.USERS, id, { 
          is_active: false,
          updated_at: new Date().toISOString()
        });
        setConfirmDialog(null);
        loadUsers();
      }
    });
  };

  const handleToggleActive = async (user: User) => {
    if (user.id) {
      await db.updateById<User>(Collections.USERS, user.id, { is_active: !user.is_active });
      loadUsers();
    }
  };

  const openPermissionsModal = (user: UserWithPermissions) => {
    setEditingUser(user);
    setPermissionsData(user.permissions || {});
    setShowPermissionsModal(true);
  };

  const handlePermissionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const existing = await db.findOne<Permission>(Collections.PERMISSIONS, { user_id: editingUser.id });

    if (existing && existing.id) {
      await db.updateById<Permission>(
        Collections.PERMISSIONS,
        existing.id,
        permissionsData
      );
    } else {
      await db.insertOne<Permission>(Collections.PERMISSIONS, {
        user_id: editingUser.id!,
        ...permissionsData,
      } as any);
    }

    loadUsers();
    setShowPermissionsModal(false);
    setEditingUser(null);
  };

  const resetForm = () => {
    setFormData({ full_name: '', role: 'viewer' });
    setPermissionsData({
      can_delete_schools: false,
      can_manage_users: false,
      can_assign_training: false,
      can_view_reports: false,
      can_manage_schools: false,
      can_manage_teachers: false,
      can_manage_mentors: false,
      can_manage_admin_personnel: false,
      can_manage_training_programs: false,
    });
    setEditingUser(null);
    setShowModal(false);
    setGeneratedCredentials(null);
  };

  const openEditModal = (user: UserWithPermissions) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      role: user.role,
    });
    setShowModal(true);
  };

  const handleRegenerateCredentials = async (user: UserWithPermissions) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Regenerate Credentials',
      message: `Are you sure you want to regenerate the password for ${user.full_name}? The old password will no longer work and they will need the new password to login.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        const newPassword = generatePassword();
        const hashedPassword = await hashPassword(newPassword);

        if (user.id) {
          await db.updateById<User>(Collections.USERS, user.id, { password_hash: hashedPassword });
        }

        setRegeneratedCredentials({ username: user.username, password: newPassword });
        setShowRegenerateModal(true);
        loadUsers();
      }
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage system users and their permissions</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'employee' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => canManage && handleToggleActive(user)}
                    disabled={!canManage}
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      } ${canManage ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    {canManage && (
                      <>
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => openPermissionsModal(user)}
                          className="text-green-600 hover:text-green-900"
                          title="Manage Permissions"
                        >
                          <Shield size={18} />
                        </button>
                        <button
                          onClick={() => handleRegenerateCredentials(user)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Regenerate Password"
                        >
                          <RefreshCw size={18} />
                        </button>
                        {user.id !== currentUser.id && (
                          <button
                            onClick={() => handleDelete(user.id!)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            {generatedCredentials ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="text-green-600" size={20} />
                    <h4 className="font-semibold text-green-900">User Created Successfully</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Username:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{generatedCredentials.username}</code>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Password:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{generatedCredentials.password}</code>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">Please save these credentials. They will not be shown again.</p>
                </div>
                <button
                  onClick={resetForm}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showPermissionsModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Manage Permissions - {editingUser.full_name}</h3>
            <form onSubmit={handlePermissionsSubmit} className="space-y-3">
              {Object.entries(permissionsData).map(([key, value]) => {
                if (key === 'id' || key === 'user_id') return null;
                const label = key.replace(/^can_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => setPermissionsData({ ...permissionsData, [key]: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                );
              })}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRegenerateModal && regeneratedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Key className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Credentials Regenerated Successfully</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-medium mb-3">
                  The old password will no longer work. Save these new credentials now!
                </p>
                <div className="space-y-3">
                  <div className="bg-white rounded border border-yellow-300 p-3">
                    <p className="text-xs text-gray-500 mb-1">Username</p>
                    <p className="text-lg font-mono font-bold text-gray-900 break-all">
                      {regeneratedCredentials.username}
                    </p>
                  </div>
                  <div className="bg-white rounded border border-yellow-300 p-3">
                    <p className="text-xs text-gray-500 mb-1">New Password</p>
                    <p className="text-lg font-mono font-bold text-gray-900 break-all">
                      {regeneratedCredentials.password}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Please save these credentials securely. They will not be shown again.
              </p>
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setRegeneratedCredentials(null);
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                I've Saved the Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="warning"
        />
      )}
    </div>
  );
}
