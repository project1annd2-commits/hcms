import { useState, useEffect } from 'react';
import { User, EmployeeTask, MomNote } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Calendar, Clock, CheckCircle, Circle, PlayCircle, Edit2, Trash2, X, Users as UsersIcon, ChevronDown, ChevronRight, List, LayoutGrid, Mic, MicOff } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import Notification from './Notification';
import TrainAnimation from './TrainAnimation';
import LiveStationBoard from './LiveStationBoard';

interface Props {
  currentUser: User;
}

interface Employee {
  id: string;
  full_name: string;
  username: string;
}

const TASK_CATEGORIES = [
  { value: 'school_followup', label: 'School follow up' },
  { value: 'training', label: 'Training' },
  { value: 'queries', label: 'Queries' },
  { value: 'audit', label: 'Audit' },
  { value: 'master_data', label: 'Master data' },
  { value: 'meetings', label: 'Meetings' },
  { value: 'adhoc_request', label: 'Adhoc school request' },
  { value: 'mcrt_tasks', label: 'MCRT other tasks' },
  { value: 'concept_planning', label: 'Concept & Planning' },
  { value: 'content_development', label: 'Content Development' },
  { value: 'editing_refinement', label: 'Editing & Refinement' },
  { value: 'marketing_launch', label: 'Marketing & Launch' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'others', label: 'Others' },
] as const;

const getCategoryLabel = (category: string) => {
  return TASK_CATEGORIES.find(c => c.value === category)?.label || category;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'school_followup':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'training':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'queries':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'audit':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'master_data':
      return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'meetings':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'adhoc_request':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'mcrt_tasks':
      return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'concept_planning':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'content_development':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'editing_refinement':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'marketing_launch':
      return 'bg-lime-100 text-lime-700 border-lime-200';
    case 'technical_support':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'others':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getCategoryGradient = (category: string) => {
  switch (category) {
    case 'school_followup':
      return { gradient: 'from-blue-50 to-white', border: 'border-blue-100', accent: 'text-blue-600' };
    case 'training':
      return { gradient: 'from-emerald-50 to-white', border: 'border-emerald-100', accent: 'text-emerald-600' };
    case 'queries':
      return { gradient: 'from-amber-50 to-white', border: 'border-amber-100', accent: 'text-amber-600' };
    case 'audit':
      return { gradient: 'from-rose-50 to-white', border: 'border-rose-100', accent: 'text-rose-600' };
    case 'master_data':
      return { gradient: 'from-cyan-50 to-white', border: 'border-cyan-100', accent: 'text-cyan-600' };
    case 'meetings':
      return { gradient: 'from-violet-50 to-white', border: 'border-violet-100', accent: 'text-violet-600' };
    case 'adhoc_request':
      return { gradient: 'from-orange-50 to-white', border: 'border-orange-100', accent: 'text-orange-600' };
    case 'mcrt_tasks':
      return { gradient: 'from-pink-50 to-white', border: 'border-pink-100', accent: 'text-pink-600' };
    case 'concept_planning':
      return { gradient: 'from-indigo-50 to-white', border: 'border-indigo-100', accent: 'text-indigo-600' };
    case 'content_development':
      return { gradient: 'from-teal-50 to-white', border: 'border-teal-100', accent: 'text-teal-600' };
    case 'editing_refinement':
      return { gradient: 'from-purple-50 to-white', border: 'border-purple-100', accent: 'text-purple-600' };
    case 'marketing_launch':
      return { gradient: 'from-lime-50 to-white', border: 'border-lime-100', accent: 'text-lime-600' };
    case 'technical_support':
      return { gradient: 'from-sky-50 to-white', border: 'border-sky-100', accent: 'text-sky-600' };
    case 'others':
    default:
      return { gradient: 'from-gray-50 to-white', border: 'border-gray-100', accent: 'text-gray-600' };
  }
};

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  }
  return `${mins}m`;
};



export default function EmployeeTasks({ currentUser }: Props) {
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [momTasks, setMomTasks] = useState<MomNote[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string } | null>(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');
  const [editingMomTask, setEditingMomTask] = useState<MomNote | null>(null);
  const [formData, setFormData] = useState({
    category: 'school_followup' as typeof TASK_CATEGORIES[number]['value'],
    title: '',
    start_time: '09:00',
    end_time: '09:30',
    time_spent: 30, // Default 30 minutes
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    notes: '',
  });

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceField, setVoiceField] = useState<'title' | 'notes' | null>(null);

  const isAdmin = currentUser.role === 'admin' || 
                  currentUser.full_name?.toLowerCase().includes('rahila') || 
                  currentUser.full_name?.toLowerCase().includes('rahia') ||
                  currentUser.full_name?.toLowerCase().includes('anees') ||
                  currentUser.full_name?.toLowerCase().includes('annes') ||
                  currentUser.full_name?.toLowerCase().includes('unnis') ||
                  currentUser.full_name?.toLowerCase().includes('asma') ||
                  currentUser.full_name?.toLowerCase().includes('ayesha') ||
                  currentUser.username?.toLowerCase().includes('rahila') ||
                  currentUser.username?.toLowerCase().includes('rahia') ||
                  currentUser.username?.toLowerCase().includes('anees') ||
                  currentUser.username?.toLowerCase().includes('annes') ||
                  currentUser.username?.toLowerCase().includes('unnis') ||
                  currentUser.username?.toLowerCase().includes('asma') ||
                  currentUser.username?.toLowerCase().includes('ayesha');

  // Check for voice recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // Voice input handler
  const startVoiceInput = (field: 'title' | 'notes') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Voice Not Supported',
        message: 'Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.'
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English
    recognition.interimResults = false;
    recognition.continuous = false;

    setIsListening(true);
    setVoiceField(field);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (field === 'title') {
        setFormData(prev => ({ ...prev, title: prev.title ? `${prev.title} ${transcript}` : transcript }));
      } else {
        setFormData(prev => ({ ...prev, notes: prev.notes ? `${prev.notes} ${transcript}` : transcript }));
      }
      setIsListening(false);
      setVoiceField(null);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setVoiceField(null);
      if (event.error === 'not-allowed') {
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'Microphone Access Denied',
          message: 'Please allow microphone access in your browser settings.'
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceField(null);
    };

    recognition.start();
  };

  useEffect(() => {
    if (isAdmin) {
      loadEmployees();
    }
    loadTasks();
  }, [selectedDate, selectedEmployee, categoryFilter]);

  const loadEmployees = async () => {
    const data = await db.find<User>(Collections.USERS, { role: 'employee', is_active: true }, { sort: { full_name: 1 } });
    let employeeList = data ? data.map(u => ({ id: u.id!, full_name: u.full_name, username: u.username })) : [];

    // Ensure current user is in the list if they are an Admin or Rahila, so they can select themselves
    if (isAdmin && currentUser.id && !employeeList.find(e => e.id === currentUser.id)) {
      employeeList.push({
        id: currentUser.id,
        full_name: currentUser.full_name,
        username: currentUser.username
      });
      // Re-sort
      employeeList.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    setEmployees(employeeList);
  };

  const loadTasks = async () => {
    setLoading(true);

    const filter: any = { date: selectedDate };

    if (isAdmin) {
      if (selectedEmployee) {
        filter.employee_id = selectedEmployee;
      }
    } else {
      filter.employee_id = currentUser.id;
    }

    const data = await db.find<EmployeeTask>(Collections.EMPLOYEE_TASKS, filter, { sort: { created_at: -1 } });

    if (data) {
      // Fetch employee details for each task manually since we don't have joins
      const tasksWithEmployees = await Promise.all(data.map(async (task) => {
        if (task.employee_id) {
          const employee = await db.findById<User>(Collections.USERS, task.employee_id);
          return { ...task, employee: employee ? { id: employee.id!, full_name: employee.full_name, username: employee.username } : undefined };
        }
        return task;
      }));
      setTasks(tasksWithEmployees);
    }

    // Fetch MoM Notes where employee is owner
    const momFilter: any = {};
    if (isAdmin) {
      if (selectedEmployee) momFilter.owner_id = selectedEmployee;
    } else {
      momFilter.owner_id = currentUser.id;
    }

    if (momFilter.owner_id) {
       const momData = await db.find<MomNote>(Collections.MOM_NOTES, momFilter);
       setMomTasks(momData || []);
    } else {
       setMomTasks([]);
    }

    setLoading(false);
  };

  const handleSaveMomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMomTask) return;

    try {
      await db.updateById(Collections.MOM_NOTES, editingMomTask.id!, {
        status: editingMomTask.status,
        action_items: editingMomTask.action_items,
        updated_at: new Date().toISOString()
      });
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'MoM Task Updated',
        message: 'The allotted task has been updated successfully'
      });
      
      loadTasks();
      resetForm();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'An error occurred'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'school_followup' as typeof TASK_CATEGORIES[number]['value'],
      title: '',
      start_time: '09:00',
      end_time: '09:30',
      time_spent: 30,
      status: 'pending',
      notes: '',
    });
    setEditingTask(null);
    setEditingMomTask(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      ...formData,
      date: selectedDate,
      employee_id: editingTask ? editingTask.employee_id : (selectedEmployee || currentUser.id!),
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingTask) {
        await db.updateById(Collections.EMPLOYEE_TASKS, editingTask.id!, taskData);
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Task Updated',
          message: 'Task has been updated successfully'
        });
      } else {
        await db.insertOne(Collections.EMPLOYEE_TASKS, {
          ...taskData,
          created_at: new Date().toISOString(),
        });
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Task Created',
          message: 'Task has been added successfully'
        });
      }
      loadTasks();
      resetForm();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: editingTask ? 'Update Failed' : 'Creation Failed',
        message: error.message || 'An error occurred'
      });
    }
  };

  const handleEdit = (task: EmployeeTask) => {
    setEditingTask(task);
    setFormData({
      category: task.category || 'others',
      title: task.title,
      start_time: task.start_time || '09:00',
      end_time: task.end_time || '09:30',
      time_spent: task.time_spent,
      status: (task.status === 'cancelled' ? 'completed' : task.status) as 'pending' | 'in_progress' | 'completed',
      notes: task.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      onConfirm: async () => {
        const success = await db.deleteById(Collections.EMPLOYEE_TASKS, id);
        setConfirmDialog(null);

        if (!success) {
          setNotification({
            isOpen: true,
            type: 'error',
            title: 'Deletion Failed',
            message: 'Failed to delete task'
          });
        } else {
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Task Deleted',
            message: 'Task has been deleted successfully'
          });
          loadTasks();
        }
      }
    });
  };

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    const success = await db.updateById(Collections.EMPLOYEE_TASKS, taskId, { status: newStatus });

    if (!success) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update status'
      });
    } else {
      loadTasks();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'in_progress':
        return <PlayCircle className="text-blue-600" size={20} />;
      default:
        return <Circle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleEmployeeExpand = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allEmployeeIds = Object.keys(employeeSummary || {});
    setExpandedEmployees(new Set(allEmployeeIds));
  };

  const collapseAll = () => {
    setExpandedEmployees(new Set());
  };

  const totalTimeSpent = tasks.reduce((sum, task) => sum + task.time_spent, 0);
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  // Apply category filter
  const filteredTasks = categoryFilter
    ? tasks.filter(t => t.category === categoryFilter)
    : tasks;

  // Calculate category breakdown
  const categoryBreakdown = filteredTasks.reduce((acc, task) => {
    const cat = task.category || 'others';
    if (!acc[cat]) {
      acc[cat] = { time: 0, count: 0 };
    }
    acc[cat].time += task.time_spent;
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { time: number; count: number }>);

  // Determine shift hours based on user request (Till Monday 23 Jan/Mar 2026)
  const shiftHours = selectedDate <= '2026-03-23' ? 5 : 8;

  const employeeSummary = isAdmin && !selectedEmployee
    ? employees.reduce((acc, emp) => {
      const empTasks = tasks.filter(t => t.employee_id === emp.id);
      acc[emp.id] = {
        name: emp.full_name,
        totalTime: empTasks.reduce((sum, t) => sum + t.time_spent, 0),
        taskCount: empTasks.length,
        isAbsent: empTasks.length === 0
      };
      return acc;
    }, {} as Record<string, { name: string; totalTime: number; taskCount: number; isAbsent: boolean }>)
    : null;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Employee Tasks' : 'My Daily Tasks'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'View and manage employee tasks and track hours' : 'Manage your tasks and track time spent'}
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="">All Categories</option>
            {TASK_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 focus:ring-0 text-sm font-medium"
            />
          </div>
          {(!isAdmin || selectedEmployee === currentUser.id || 
            currentUser.full_name?.toLowerCase().includes('rahila') ||
            currentUser.full_name?.toLowerCase().includes('rahia') ||
            currentUser.full_name?.toLowerCase().includes('asma') ||
            currentUser.full_name?.toLowerCase().includes('ayesha') ||
            currentUser.username?.toLowerCase().includes('rahila') ||
            currentUser.username?.toLowerCase().includes('rahia') ||
            currentUser.username?.toLowerCase().includes('asma') ||
            currentUser.username?.toLowerCase().includes('ayesha')) && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md active:scale-95"
            >
              <Plus size={20} />
              Add Task
            </button>
          )}
        </div>
      </div>

      {(() => {
        let lastTaskEndTime = 0;
        if (tasks.length > 0) {
          tasks.forEach(task => {
            if (task.end_time) {
              const [hours, minutes] = task.end_time.split(':').map(Number);
              const taskMinutes = hours * 60 + minutes;
              if (taskMinutes > lastTaskEndTime) {
                lastTaskEndTime = taskMinutes;
              }
            }
          });
        }
        return !isAdmin && (
          <div className="space-y-4">
            <LiveStationBoard />
            <TrainAnimation progressEndTime={lastTaskEndTime} taskCount={tasks.length} />
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <Calendar className="text-gray-400" size={32} />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Completed</p>
              <p className="text-3xl font-bold text-green-600">{completedCount}</p>
            </div>
            <CheckCircle className="text-green-400" size={32} />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
            </div>
            <PlayCircle className="text-blue-400" size={32} />
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">Time Spent</p>
              <p className="text-3xl font-bold text-orange-600">{formatDuration(totalTimeSpent)}</p>
            </div>
            <Clock className="text-orange-400" size={32} />
          </div>
        </div>
      </div>

      {
        employeeSummary && Object.keys(employeeSummary).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UsersIcon size={20} className="text-blue-600" />
              Employee Hours Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(employeeSummary)
                .sort(([, a], [, b]) => {
                  if (a.isAbsent !== b.isAbsent) return a.isAbsent ? 1 : -1;
                  return b.totalTime - a.totalTime;
                })
                .map(([empId, summary]) => (
                  <div key={empId} className={`relative bg-gradient-to-br p-4 rounded-lg border ${summary.isAbsent ? 'from-red-50 to-white border-red-100 opacity-75' : 'from-blue-50 to-white border-blue-100'}`}>
                    {summary.isAbsent && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full border border-red-200 uppercase tracking-wider animate-pulse">
                          Absent
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-semibold ${summary.isAbsent ? 'text-gray-500' : 'text-gray-900'}`}>{summary.name}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock size={14} className={summary.isAbsent ? 'text-gray-400' : 'text-blue-600'} />
                            <span className="text-gray-700">
                              <span className={`font-bold ${summary.isAbsent ? 'text-gray-400' : 'text-blue-600'}`}>{formatDuration(summary.totalTime)}</span>
                              {!summary.isAbsent && <span className="text-xs text-gray-400 ml-1">/ {shiftHours}h shift</span>}
                            </span>
                          </div>
                          {!summary.isAbsent && (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle size={14} className="text-green-600" />
                              <span className="text-gray-700">
                                <span className="font-bold text-green-600">{summary.taskCount}</span> tasks
                              </span>
                            </div>
                          )}
                          {summary.isAbsent && (
                            <p className="text-[10px] text-red-400 font-medium italic mt-1">
                              No tasks added for this date
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      }

      {/* View Mode Toggle - Only show for employee (non-admin) view */}
      {
        (!isAdmin || selectedEmployee) && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === 'timeline' ? 'Daily Schedule' : 'Task List'}
            </h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-white'}`}
                title="Timeline View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-white'}`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        )
      }

      {/* Timeline View */}
      {
        (!isAdmin || selectedEmployee) && viewMode === 'timeline' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-x-auto">
            <div className="relative min-w-[800px]">
              {/* Time Labels */}
              <div className="flex border-b border-gray-200 pb-2 mb-4">
                {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                  <div key={hour} className="flex-1 text-center">
                    <span className="text-xs font-medium text-gray-500">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timeline Grid */}
              <div className="relative h-24 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                {/* Hour lines */}
                {Array.from({ length: 13 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-gray-200"
                    style={{ left: `${(i / 12) * 100}%` }}
                  />
                ))}

                {/* Tasks positioned on timeline */}
                {filteredTasks
                  .filter(task => task.start_time && task.end_time)
                  .map((task) => {
                    const [startH, startM] = (task.start_time || '09:00').split(':').map(Number);
                    const [endH, endM] = (task.end_time || '09:30').split(':').map(Number);

                    // Calculate position (8 AM = 0%, 8 PM = 100%)
                    const startMinutes = startH * 60 + startM;
                    const endMinutes = endH * 60 + endM;
                    const dayStartMinutes = 8 * 60; // 8 AM
                    const dayEndMinutes = 20 * 60; // 8 PM
                    const totalMinutes = dayEndMinutes - dayStartMinutes;

                    const left = Math.max(0, ((startMinutes - dayStartMinutes) / totalMinutes) * 100);
                    const width = Math.min(100 - left, ((endMinutes - startMinutes) / totalMinutes) * 100);

                    // Skip if completely outside 8-8 range
                    if (endMinutes <= dayStartMinutes || startMinutes >= dayEndMinutes) return null;

                    const colors = getCategoryGradient(task.category);

                    return (
                      <div
                        key={task.id}
                        className={`absolute top-2 bottom-2 rounded-lg px-2 py-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r ${colors.gradient} border ${colors.border}`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 5)}%`,
                        }}
                        title={`${task.title} (${task.start_time} - ${task.end_time})`}
                        onClick={() => handleEdit(task)}
                      >
                        <p className={`text-xs font-semibold truncate ${colors.accent}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {task.start_time} - {task.end_time}
                        </p>
                        <span className={`text-xs ${task.status === 'completed' ? 'text-green-600' : task.status === 'in_progress' ? 'text-blue-600' : 'text-gray-500'}`}>
                          {task.status === 'completed' ? '✓' : task.status === 'in_progress' ? '▶' : '○'}
                        </span>
                      </div>
                    );
                  })}

                {/* Tasks without time - show at bottom */}
                {filteredTasks.filter(task => !task.start_time || !task.end_time).length > 0 && (
                  <div className="absolute -bottom-8 left-0 text-xs text-gray-400">
                    +{filteredTasks.filter(task => !task.start_time || !task.end_time).length} tasks without scheduled time
                  </div>
                )}
              </div>

              {/* Current time indicator */}
              {(() => {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const dayStartMinutes = 8 * 60;
                const dayEndMinutes = 20 * 60;
                const totalMinutes = dayEndMinutes - dayStartMinutes;
                const position = ((currentMinutes - dayStartMinutes) / totalMinutes) * 100;

                if (position >= 0 && position <= 100) {
                  return (
                    <div
                      className="absolute top-8 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{ left: `${position}%` }}
                    >
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )
      }

      {/* List View */}
      <div className={`space-y-3 ${(!isAdmin || selectedEmployee) && viewMode === 'timeline' ? 'hidden' : ''}`}>
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">No tasks for this date{categoryFilter ? ' in this category' : ''}</p>
            <p className="text-sm text-gray-400 mt-2">Click Add Task to create your first task</p>
          </div>
        ) : isAdmin && !selectedEmployee && employeeSummary ? (
          <>
            <div className="flex justify-end gap-2 mb-3">
              <button
                onClick={expandAll}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Collapse All
              </button>
            </div>
            {Object.entries(employeeSummary)
              .sort(([, a], [, b]) => b.totalTime - a.totalTime)
              .map(([empId, summary]) => {
                const employeeTasks = filteredTasks.filter(t => t.employee_id === empId);
                const isExpanded = expandedEmployees.has(empId);

                return (
                  <div key={empId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleEmployeeExpand(empId)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown size={20} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-600" />
                        )}
                        <UsersIcon size={20} className="text-blue-600" />
                        <div className="text-left">
                          <h3 className="text-lg font-bold text-gray-900">{summary.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock size={14} className="text-blue-600" />
                              <span className="font-semibold text-blue-600">{formatDuration(summary.totalTime)}</span>
                            </span>
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <CheckCircle size={14} className="text-green-600" />
                              <span className="font-semibold text-green-600">{summary.taskCount}</span> tasks
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="space-y-3">
                          {employeeTasks.map((task) => (
                            <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                  {getStatusIcon(task.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getCategoryColor(task.category)}`}>
                                          {getCategoryLabel(task.category)}
                                        </span>
                                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                                      </div>
                                      {task.notes && (
                                        <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-3 mt-2">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                                          {task.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <div className="flex items-center gap-1 text-sm text-gray-600">
                                          <Clock size={14} />
                                          <span>{formatDuration(task.time_spent)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {(isAdmin || task.employee_id === currentUser.id) && (
                                        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                          <button
                                            onClick={() => handleStatusChange(task.id!, 'pending')}
                                            className={`p-1 rounded ${task.status === 'pending' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                                            title="Mark as Pending"
                                          >
                                            <Circle size={16} className="text-gray-600" />
                                          </button>
                                          <button
                                            onClick={() => handleStatusChange(task.id!, 'in_progress')}
                                            className={`p-1 rounded ${task.status === 'in_progress' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                                            title="Mark as In Progress"
                                          >
                                            <PlayCircle size={16} className="text-blue-600" />
                                          </button>
                                          <button
                                            onClick={() => handleStatusChange(task.id!, 'completed')}
                                            className={`p-1 rounded ${task.status === 'completed' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                                            title="Mark as Completed"
                                          >
                                            <CheckCircle size={16} className="text-green-600" />
                                          </button>
                                        </div>
                                      )}
                                      {(isAdmin || task.employee_id === currentUser.id) && (
                                        <>
                                          <button
                                            onClick={() => handleEdit(task)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Edit Task"
                                          >
                                            <Edit2 size={18} />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(task.id!)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Delete Task"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getCategoryColor(task.category)}`}>
                          {getCategoryLabel(task.category)}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        {isAdmin && task.employee && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            <UsersIcon size={12} />
                            {task.employee.full_name}
                          </span>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>

                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock size={14} />
                          <span>{formatDuration(task.time_spent)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(isAdmin || task.employee_id === currentUser.id) && (
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => handleStatusChange(task.id!, 'pending')}
                            className={`p-1 rounded ${task.status === 'pending' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                            title="Mark as Pending"
                          >
                            <Circle size={16} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(task.id!, 'in_progress')}
                            className={`p-1 rounded ${task.status === 'in_progress' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                            title="Mark as In Progress"
                          >
                            <PlayCircle size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(task.id!, 'completed')}
                            className={`p-1 rounded ${task.status === 'completed' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                            title="Mark as Completed"
                          >
                            <CheckCircle size={16} className="text-green-600" />
                          </button>
                        </div>
                      )}
                      {(isAdmin || task.employee_id === currentUser.id) && (
                        <>
                          <button
                            onClick={() => handleEdit(task)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Task"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Task"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MoM Allotted Tasks Section */}
      {momTasks.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <List size={20} className="text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">MoM Allotted Tasks</h3>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">{momTasks.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {momTasks.map(mom => (
              <div key={mom.id} className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform" />
                <div className="relative">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100 uppercase">Minutes of Meeting</span>
                    <button 
                      onClick={() => {
                        setEditingMomTask(mom);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Update Task Achievement"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2 line-clamp-1">{mom.title}</h4>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={14} className="text-purple-400" />
                      <span>Meeting: {new Date(mom.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    {mom.deadline_date && (
                      <div className="flex items-center gap-2 text-xs font-medium text-red-500">
                        <Clock size={14} />
                        <span>Deadline: {new Date(mom.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Action Items</p>
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: mom.action_items || '<span class="italic">No items listed</span>' }} />
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      mom.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                      mom.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {mom.status || 'Draft'}
                    </span>
                    <span className="text-[10px] text-gray-400 italic">Meeting #{mom.meeting_number || 'NA'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {
        Object.keys(categoryBreakdown).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              Time by Category
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(categoryBreakdown)
                .sort(([, a], [, b]) => b.time - a.time)
                .map(([category, stats]) => {
                  const colors = getCategoryGradient(category);
                  return (
                    <div key={category} className={`bg-gradient-to-br ${colors.gradient} p-4 rounded-lg border ${colors.border}`}>
                      <p className="text-sm font-medium text-gray-700">{getCategoryLabel(category)}</p>
                      <p className={`text-2xl font-bold ${colors.accent}`}>{formatDuration(stats.time)}</p>
                      <p className="text-xs text-gray-500">{stats.count} task{stats.count !== 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        )
      }

      {/* MoM Task Edit Modal */}
      {editingMomTask && showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Update MoM Task</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <h4 className="font-bold text-purple-900">{editingMomTask.title}</h4>
              <p className="text-xs text-purple-600 mt-1">Meeting Date: {new Date(editingMomTask.date).toLocaleDateString()}</p>
            </div>

            <form onSubmit={handleSaveMomTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingMomTask.status || 'Draft'}
                  onChange={(e) => setEditingMomTask({ ...editingMomTask, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Draft">Draft</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Items / Progress Updates</label>
                <div className="border border-gray-300 rounded-lg p-2 min-h-[200px]">
                  {/* Reuse RichTextEditor if available, but it's not imported here yet. 
                      Actually, MomNotesView uses it. Let's check imports in EmployeeTasks. 
                      It's not imported. I'll use a textarea for complexity reduction or import it.
                  */}
                  <textarea
                    value={editingMomTask.action_items || ''}
                    onChange={(e) => setEditingMomTask({ ...editingMomTask, action_items: e.target.value })}
                    rows={10}
                    className="w-full px-3 py-2 border-0 focus:ring-0 text-sm font-sans"
                    placeholder="Update your progress on the allotted tasks..."
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Note: This updates the main Minutes of Meeting record.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {
        showModal && !editingMomTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingTask ? 'Edit Task' : 'Add New Task'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {TASK_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={isListening && voiceField === 'title' ? '🎤 Listening...' : 'Enter task description'}
                    />
                    {voiceSupported && (
                      <button
                        type="button"
                        onClick={() => startVoiceInput('title')}
                        disabled={isListening}
                        className={`px-3 py-2 rounded-lg transition-all ${isListening && voiceField === 'title'
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        title="Speak to add task title"
                      >
                        {isListening && voiceField === 'title' ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => {
                        const startTime = e.target.value;
                        // Calculate new end time based on current duration
                        const [startH, startM] = startTime.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;
                        const endMinutes = startMinutes + formData.time_spent;
                        const endH = Math.floor(endMinutes / 60) % 24;
                        const endM = endMinutes % 60;
                        const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                        setFormData({ ...formData, start_time: startTime, end_time: endTime });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => {
                        const endTime = e.target.value;
                        const [startH, startM] = formData.start_time.split(':').map(Number);
                        const [endH, endM] = endTime.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;
                        const endMinutes = endH * 60 + endM;
                        const duration = Math.max(0, endMinutes - startMinutes);
                        setFormData({ ...formData, end_time: endTime, time_spent: duration });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Duration:</span>{' '}
                    <span className="font-bold">{formatDuration(formData.time_spent)}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'in_progress' | 'completed' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={isListening && voiceField === 'notes' ? '🎤 Listening...' : 'Additional notes about this task'}
                    />
                    {voiceSupported && (
                      <button
                        type="button"
                        onClick={() => startVoiceInput('notes')}
                        disabled={isListening}
                        className={`px-3 self-start py-2 rounded-lg transition-all ${isListening && voiceField === 'notes'
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        title="Speak to add notes"
                      >
                        {isListening && voiceField === 'notes' ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
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
                    {editingTask ? 'Update Task' : 'Create Task'}
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
    </div>
  );
}
