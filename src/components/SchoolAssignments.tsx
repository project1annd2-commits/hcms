import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { User, Permission, School, SchoolAssignment } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { UserPlus, X, Building2, Users as UsersIcon, Trash2, Filter } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import Notification from './Notification';
import { isAsmaAyesha } from '../lib/accessControl';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

interface Employee {
  id: string;
  full_name: string;
  username: string;
}

interface Assignment extends SchoolAssignment {
  school?: School | null;
  employee?: Employee;
}

export default function SchoolAssignments({ currentUser, currentPermissions }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'by-school' | 'by-employee' | 'table' | 'analytics'>('by-school');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [spocFilter, setSpocFilter] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string } | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [schoolAssignments, setSchoolAssignments] = useState<Record<string, string>>({});

  const isRafaha = currentUser.role === 'employee' && currentUser.username.toLowerCase().includes('rafaha');
  const isAsma = isAsmaAyesha(currentUser);
  const canManage = currentUser.role === 'admin' || currentPermissions.can_manage_schools;
  const canAddAssignment = canManage || isRafaha || isAsma;
  const canRemoveAssignment = canManage || isRafaha; // Asma Ayesha cannot remove assignments

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      // 1. Fetch Assignments
      // Fetch all assignments for everyone to support analytics
      // const assignmentsFilter: any = {};
      // if (currentUser.role !== 'admin') {
      //   assignmentsFilter.employee_id = currentUser.id;
      // }
      const assignmentsData = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, {}, { sort: { assigned_at: -1 } });

      // 2. Fetch Schools
      let schoolsData: School[] = [];
      if (currentUser.role !== 'admin' && !isRafaha && !isAsma) {
        // For non-admins (except Rafa), only show assigned schools
        const assignedSchoolIds = assignmentsData.map(a => a.school_id);
        // Manual "in" query by fetching all and filtering (optimization: fetch all is okay for now)
        const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
        schoolsData = allSchools.filter(s => assignedSchoolIds.includes(s.id!));
      } else {
        // Admins and Rafa can see all schools
        schoolsData = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
      }

      // 3. Fetch Employees
      const employeesData = await db.find<User>(Collections.USERS, { role: 'employee', is_active: true }, { sort: { full_name: 1 } });
      const formattedEmployees = employeesData.map(u => ({ id: u.id!, full_name: u.full_name, username: u.username }));

      // 4. Join Data
      const formattedAssignments = await Promise.all(assignmentsData.map(async (a) => {
        const school = schoolsData.find(s => s.id === a.school_id) || await db.findById<School>(Collections.SCHOOLS, a.school_id);
        const employeeUser = employeesData.find(e => e.id === a.employee_id) || await db.findById<User>(Collections.USERS, a.employee_id);
        const employee = employeeUser ? { id: employeeUser.id!, full_name: employeeUser.full_name, username: employeeUser.username } : undefined;

        return {
          ...a,
          school,
          employee
        };
      }));

      setAssignments(formattedAssignments);
      setSchools(schoolsData);
      setEmployees(formattedEmployees);

      const assignmentMap: Record<string, string> = {};
      formattedAssignments.forEach((a) => {
        if (a.school_id && a.employee) {
          assignmentMap[a.school_id] = a.employee.full_name;
        }
      });
      setSchoolAssignments(assignmentMap);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSchools.length === 0 || !selectedEmployee) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Selection Required',
        message: 'Please select at least one school and an employee'
      });
      return;
    }

    try {
      // Check for existing assignments
      for (const schoolId of selectedSchools) {
        const existing = await db.findOne(Collections.SCHOOL_ASSIGNMENTS, { school_id: schoolId, employee_id: selectedEmployee });
        if (existing) {
          setNotification({
            isOpen: true,
            type: 'warning',
            title: 'Already Assigned',
            message: `One or more selected schools are already assigned to this employee`
          });
          return;
        }

        // For Asma Ayesha, prevent reassigning schools that are already assigned to SOMEONE
        const currentAssignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { school_id: schoolId });
        
        if (isAsma) {
          // 1. Cannot change existing assignments
          if (currentAssignments.length > 0) {
            setNotification({
              isOpen: true,
              type: 'error',
              title: 'Permission Denied',
              message: 'You cannot change already assigned schools. Please only assign unassigned schools.'
            });
            return;
          }
        }

        if (currentAssignments.length > 0) {
          // FIND and DELETE existing assignments for this school to perform a REASSIGN
          // This ensures the school moves from old employee(s) to the new one
          await Promise.all(currentAssignments.map(a => db.deleteById(Collections.SCHOOL_ASSIGNMENTS, a.id!)));
        }
      }

      const assignmentsToCreate = selectedSchools.map(schoolId => ({
        school_id: schoolId,
        employee_id: selectedEmployee,
        assigned_by: currentUser.id!,
        assigned_at: new Date().toISOString(),
      }));

      // Insert individually since we don't have bulk insert exposed in the simple service wrapper yet for this usage
      // Or use Promise.all
      await Promise.all(assignmentsToCreate.map(a => db.insertOne(Collections.SCHOOL_ASSIGNMENTS, a)));

      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Schools Assigned',
        message: `Successfully assigned ${selectedSchools.length} school(s) to the employee`
      });

      loadData();
      setShowModal(false);
      setSelectedSchools([]);
      setSelectedEmployee('');

    } catch (error) {
      console.error('Assignment error:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Assignment Failed',
        message: (error as Error).message || 'An error occurred'
      });
    }
  };

  const handleRemove = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Assignment',
      message: 'Are you sure you want to remove this school assignment from the employee? This action cannot be undone.',
      onConfirm: async () => {
        const success = await db.deleteById(Collections.SCHOOL_ASSIGNMENTS, id);
        setConfirmDialog(null);

        if (!success) {
          setNotification({
            isOpen: true,
            type: 'error',
            title: 'Removal Failed',
            message: 'Failed to remove assignment'
          });
        } else {
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Assignment Removed',
            message: 'School assignment has been removed successfully'
          });
          loadData();
        }
      }
    });
  };

  const groupedBySchool = assignments.reduce((acc, assignment) => {
    const schoolId = assignment.school_id;
    if (!acc[schoolId]) {
      acc[schoolId] = {
        school: assignment.school || undefined,
        employees: [],
      };
    }
    acc[schoolId].employees.push({
      id: assignment.id!,
      employee: assignment.employee,
      assigned_at: assignment.assigned_at,
    });
    return acc;
  }, {} as Record<string, { school?: School; employees: Array<{ id: string; employee?: Employee; assigned_at: string }> }>);

  const groupedByEmployee = assignments.reduce((acc, assignment) => {
    const employeeId = assignment.employee_id;
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee: assignment.employee,
        schools: [],
      };
    }
    acc[employeeId].schools.push({
      id: assignment.id!,
      school: assignment.school || undefined,
      assigned_at: assignment.assigned_at,
    });
    return acc;
  }, {} as Record<string, { employee?: Employee; schools: Array<{ id: string; school?: School; assigned_at: string }> }>);

  // Prepare pie chart data
  const pieChartData = Object.entries(groupedByEmployee).map(([employeeId, data]) => ({
    name: data.employee?.full_name || 'Unknown',
    value: data.schools.length,
    employeeId
  })).filter(item => item.value > 0);

  // Generate colors for pie chart
  // Analytics Data
  const uniqueStates = Array.from(new Set(schools.map(s => s.state || 'Unknown'))).sort();

  const getAnalyticsData = () => {
    let filtered = assignments;

    if (stateFilter !== 'all') {
      filtered = filtered.filter(a => (a.school?.state || 'Unknown') === stateFilter);
    }

    if (spocFilter !== 'all') {
      filtered = filtered.filter(a => a.employee_id === spocFilter);
    }

    return filtered;
  };

  const analyticsData = getAnalyticsData();

  const COLORS = [
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // purple-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
    '#F97316', // orange-500
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!canManage && !isRafaha && !isAsma) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">You do not have permission to view school assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Assignments</h2>
          <p className="text-gray-600 mt-1">Assign schools to employees for management</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('by-school')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'by-school'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              By School
            </button>
            <button
              onClick={() => setViewMode('by-employee')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'by-employee'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              By Employee
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'analytics'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Analytics
            </button>
          </div>
          {canAddAssignment && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={20} />
              Assign School
            </button>
          )}
        </div>
      </div>



      {/* Statistics and Pie Chart */}
      {
        viewMode !== 'analytics' && viewMode !== 'table' && assignments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Schools Distribution by Employee</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Statistics Cards */}
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">Total Assignments</p>
                  <p className="text-3xl font-bold text-blue-600">{assignments.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-700 font-medium">Active Employees</p>
                  <p className="text-3xl font-bold text-green-600">{Object.keys(groupedByEmployee).length}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-purple-700 font-medium">Average Schools per Employee</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {Object.keys(groupedByEmployee).length > 0
                      ? (assignments.length / Object.keys(groupedByEmployee).length).toFixed(1)
                      : '0'}
                  </p>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="flex items-center justify-center">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value} school${value !== 1 ? 's' : ''}`, 'Assigned']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <p>No data available for chart</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {(viewMode === 'by-school' || viewMode === 'by-employee') && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">No school assignments yet</p>
              <p className="text-sm text-gray-400 mt-2">Click the button above to assign schools to employees</p>
            </div>
          ) : viewMode === 'by-school' ? (
            Object.entries(groupedBySchool).map(([schoolId, data]) => (
              <div key={schoolId} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-blue-600" size={24} />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{data.school?.name}</h3>
                      <p className="text-sm text-gray-600">Code: {data.school?.code}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <UsersIcon size={18} className="text-gray-500" />
                    <h4 className="font-semibold text-gray-900">Assigned Employees ({data.employees.length})</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{emp.employee?.full_name}</p>
                          <p className="text-sm text-gray-500">{emp.employee?.username}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Assigned {new Date(emp.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                        {canRemoveAssignment && (
                          <button
                            onClick={() => handleRemove(emp.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Remove Assignment"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            Object.entries(groupedByEmployee).map(([employeeId, data]) => (
              <div key={employeeId} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-100">
                  <div className="flex items-center gap-3">
                    <UsersIcon className="text-green-600" size={24} />
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{data.employee?.full_name}</h3>
                      <p className="text-sm text-gray-600">Username: {data.employee?.username}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 size={18} className="text-gray-500" />
                    <h4 className="font-semibold text-gray-900">Assigned Schools ({data.schools.length})</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.schools.map((sch) => (
                      <div
                        key={sch.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{sch.school?.name}</p>
                          <p className="text-sm text-gray-500">Code: {sch.school?.code}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Assigned {new Date(sch.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                        {canRemoveAssignment && (
                          <button
                            onClick={() => handleRemove(sch.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Remove Assignment"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">School Name</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">School Code</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Assigned Employee</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Employee Username</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Assigned Date</th>
                  {canRemoveAssignment && <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {assignment.school?.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {assignment.school?.code || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {assignment.employee?.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {assignment.employee?.username}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </td>
                    {canRemoveAssignment && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemove(assignment.id!)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remove Assignment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No assignments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter size={18} />
              Filters:
            </div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All States</option>
              {uniqueStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <select
              value={spocFilter}
              onChange={(e) => setSpocFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All SPOCs</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
            {(stateFilter !== 'all' || spocFilter !== 'all') && (
              <button
                onClick={() => { setStateFilter('all'); setSpocFilter('all'); }}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Analytics Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Total Schools</p>
              <p className="text-2xl font-bold text-blue-800">{analyticsData.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Unique SPOCs</p>
              <p className="text-2xl font-bold text-green-800">
                {new Set(analyticsData.map(a => a.employee_id)).size}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">Unique States</p>
              <p className="text-2xl font-bold text-purple-800">
                {new Set(analyticsData.map(a => a.school?.state || 'Unknown')).size}
              </p>
            </div>
          </div>

          {/* Excel-like Table */}
          <div className="bg-white rounded-lg shadow border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-2 border-r border-gray-300">School Name</th>
                    <th className="px-4 py-2 border-r border-gray-300">School Code</th>
                    <th className="px-4 py-2 border-r border-gray-300">State</th>
                    <th className="px-4 py-2 border-r border-gray-300">Assigned SPOC</th>
                    <th className="px-4 py-2 border-r border-gray-300">Assigned Date</th>
                    {canRemoveAssignment && <th className="px-4 py-2">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analyticsData.map((assignment, index) => (
                    <tr key={assignment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 border-r border-gray-200">{assignment.school?.name}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{assignment.school?.code}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{assignment.school?.state || 'Unknown'}</td>
                      <td className="px-4 py-2 border-r border-gray-200 font-medium text-blue-700">{assignment.employee?.full_name}</td>
                      <td className="px-4 py-2 border-r border-gray-200">{new Date(assignment.assigned_at).toLocaleDateString()}</td>
                      {canRemoveAssignment && (
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleRemove(assignment.id!)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove Assignment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {analyticsData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                        No data matches your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Schools to Employee</h3>
              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schools (select multiple)
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                    {schools.map((school) => {
                      const isAssigned = schoolAssignments[school.id!];
                      const isAssignedToSelected = isAssigned && isAssigned === employees.find(e => e.id === selectedEmployee)?.full_name;
                      return (
                        <label
                          key={school.id}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${isAssignedToSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSchools.includes(school.id!)}
                            // Asma cannot select already assigned schools OR schools that are not 100% converted
                            disabled={!!isAssignedToSelected || (isAsma && !!isAssigned)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSchools([...selectedSchools, school.id!]);
                              } else {
                                setSelectedSchools(selectedSchools.filter(id => id !== school.id));
                              }
                            }}
                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-900">
                                {school.name} <span className="text-gray-500 text-sm">({school.code})</span>
                              </div>
                              {isAssigned && !isAssignedToSelected && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">Reassign</span>
                              )}
                            </div>
                            {isAssigned && (
                              <div className="text-xs text-gray-500 mt-1">
                                Currently assigned to: <span className="font-semibold">{isAssigned}</span>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Selecting an already assigned school will reassign it to the new employee.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select an employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedSchools([]);
                      setSelectedEmployee('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Assign
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {
        notification && (
          <Notification
            isOpen={notification.isOpen}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )
      }

      {
        confirmDialog && (
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title={confirmDialog.title}
            message={confirmDialog.message}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )
      }
    </div >
  );
}
