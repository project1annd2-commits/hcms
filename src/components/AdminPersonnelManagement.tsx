import { useState, useEffect } from 'react';
import { AdminPersonnel, Permission } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  currentPermissions: Permission;
}

export default function AdminPersonnelManagement({ currentPermissions }: Props) {
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<AdminPersonnel | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    hire_date: '',
    status: 'active' as 'active' | 'inactive',
  });

  const canManage = currentPermissions.can_manage_admin_personnel;

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    setLoading(true);
    const data = await db.find<AdminPersonnel>(Collections.ADMIN_PERSONNEL, {}, { sort: { last_name: 1 } });
    setPersonnel(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      hire_date: formData.hire_date || null,
    };

    if (editingPersonnel && editingPersonnel.id) {
      await db.updateById<AdminPersonnel>(Collections.ADMIN_PERSONNEL, editingPersonnel.id, data);
    } else {
      await db.insertOne<AdminPersonnel>(Collections.ADMIN_PERSONNEL, {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    loadPersonnel();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Personnel',
      message: 'Are you sure you want to delete this personnel record? This action cannot be undone.',
      onConfirm: async () => {
        await db.deleteById(Collections.ADMIN_PERSONNEL, id);
        setConfirmDialog(null);
        loadPersonnel();
      }
    });
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      hire_date: '',
      status: 'active',
    });
    setEditingPersonnel(null);
    setShowModal(false);
  };

  const openEditModal = (person: AdminPersonnel) => {
    setEditingPersonnel(person);
    setFormData({
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone,
      position: person.position,
      department: person.department,
      hire_date: person.hire_date || '',
      status: person.status,
    });
    setShowModal(true);
  };

  const groupByDepartment = () => {
    const grouped: Record<string, AdminPersonnel[]> = {};
    personnel.forEach(person => {
      const dept = person.department || 'Unassigned';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(person);
    });
    return grouped;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const groupedPersonnel = groupByDepartment();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Administrative Personnel</h2>
          <p className="text-gray-600 mt-1">Manage administrative and management staff</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Personnel
          </button>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPersonnel).map(([department, people]) => (
          <div key={department} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{department}</h3>
              <p className="text-sm text-gray-600">{people.length} {people.length === 1 ? 'person' : 'people'}</p>
            </div>
            <div className="divide-y divide-gray-200">
              {people.map((person) => (
                <div key={person.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-100 p-3 rounded-lg">
                        <Briefcase className="text-orange-600" size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{person.first_name} {person.last_name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{person.position || 'No position specified'}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Email:</span> {person.email || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {person.phone || 'N/A'}
                          </div>
                          {person.hire_date && (
                            <div>
                              <span className="font-medium">Hire Date:</span> {new Date(person.hire_date).toLocaleDateString()}
                            </div>
                          )}
                          <div>
                            <span className={`px-2 py-1 text-xs rounded-full ${person.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {person.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(person)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(person.id!)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {personnel.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Briefcase className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No administrative personnel found. Add your first record to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingPersonnel ? 'Edit Personnel' : 'Add New Personnel'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPersonnel ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="danger"
        />
      )}
    </div>
  );
}
