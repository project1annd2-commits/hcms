import { useState, useEffect } from 'react';
import {
    Plus, Search, FileText, X, Save, Trash2, Calendar,
    User as UserIcon, Download, Filter, ChevronRight, ChevronLeft,
    CheckCircle2, Edit3, Clock, Hash, AlertCircle, List, GitCommit,
    CalendarDays, MapPin, Link as LinkIcon
} from 'lucide-react';
import { User, TrainingSession } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import RichTextEditor from './common/RichTextEditor';

interface Props {
    currentUser: User;
}

const MODES = ['Offline', 'Online', 'Hybrid'] as const;
const STATUS_STYLES: Record<string, string> = {
    'scheduled': 'bg-blue-50 text-blue-700 border-blue-200',
    'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'cancelled': 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TrainingCalendar({ currentUser }: Props) {
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [employees, setEmployees] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // View states
    const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'timeline'>('list');
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Panel state
    const [panelSession, setPanelSession] = useState<Partial<TrainingSession> | null>(null);
    const [isSaving, setIsSaving] = useState(false);


    // Selected row
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);


    const loadData = async () => {
        setLoading(true);
        try {
            const [dbSessions, dbUsers] = await Promise.all([
                db.find<TrainingSession>(Collections.TRAINING_SESSIONS, {}),
                db.find<User>(Collections.USERS, {})
            ]);
            setSessions(dbSessions.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
            setEmployees(dbUsers.filter(u => u.is_active !== false).sort((a, b) => a.full_name.localeCompare(b.full_name)));
        } catch (error) {
            console.error('Error loading training data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        const today = new Date().toISOString().split('T')[0];
        setPanelSession({
            title: '',
            description: '',
            start_date: today,
            start_time: '09:00',
            end_date: today,
            end_time: '10:00',
            is_all_day: false,
            location: '',
            meeting_link: '',
            category: 'General',
            status: 'scheduled',
            grades: '',
            mode: 'Online',
            training_type: 'Standardized Ops',
            sequence: 1,
            no_of_days: 1,
            owner_id: '',
            owner_name: '',
            comments: '',
            gap_reason: '',
            created_by: currentUser.full_name
        });
        setSelectedRowId(null);
    };

    const handleOpenPanel = (session: TrainingSession) => {
        setPanelSession({ ...session });
        setSelectedRowId(session.id || null);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this training session permanently?')) return;
        try {
            await db.deleteById(Collections.TRAINING_SESSIONS, id);
            if (panelSession && (panelSession as TrainingSession).id === id) setPanelSession(null);
            await loadData();
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    const handleSave = async () => {
        if (!panelSession || !panelSession.title || !panelSession.start_date) {
            alert('Please provide title and start date.');
            return;
        }
        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const sessionToSave = {
                ...panelSession,
                updated_at: now,
                created_by: panelSession.created_by || currentUser.full_name
            };

            if (panelSession.id) {
                await db.updateById(Collections.TRAINING_SESSIONS, panelSession.id, sessionToSave);
            } else {
                await db.insertOne(Collections.TRAINING_SESSIONS, {
                    ...sessionToSave,
                    created_at: now
                } as TrainingSession);
            }
            setPanelSession(null);
            setSelectedRowId(null);
            await loadData();
        } catch (error) {
            console.error('Error saving session:', error);
            alert('Failed to save session');
        } finally {
            setIsSaving(false);
        }
    };


    const exportCSV = () => {
        const headers = [
            'Sl No', 'Grades', 'Training details', 'Mode of training', 'Type of training',
            'Training sequence', 'Days', 'Date', 'No. of days', 'Owner', 'Timing',
            'Comments', 'Reason for gaps', 'Status'
        ];
        
        const rows = filteredSessions.map((s, i) => [
            i + 1,
            `"${(s.grades || '').replace(/"/g, '""')}"`,
            `"${(s.title || '').replace(/"/g, '""')}"`,
            s.mode || '',
            s.training_type || '',
            s.sequence || '',
            s.start_date ? new Date(s.start_date).toLocaleDateString('en-US', { weekday: 'long' }) : '',
            s.start_date ? s.start_date.split('T')[0] : '',
            s.no_of_days || '',
            `"${(s.owner_name || '').replace(/"/g, '""')}"`,
            `"${s.start_time || ''} - ${s.end_time || ''}"`,
            `"${(s.comments || '').replace(/"/g, '""')}"`,
            `"${(s.gap_reason || '').replace(/"/g, '""')}"`,
            s.status
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Training_Calendar_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const filteredSessions = sessions.filter(s => {
        const matchSearch = !searchTerm ||
            s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.grades || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchDate = !dateFilter || s.start_date.startsWith(dateFilter);
        return matchSearch && matchDate;
    });

    const getDayName = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
    };

    // --- Calendar View Helpers ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendarView = () => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const prevMonthDays = Array.from({ length: firstDay }, (_, i) => i);
        
        const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
            <div className="p-4 h-full flex flex-col bg-white overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{monthName}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCalendarDate(new Date(year, month - 1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-600"><ChevronLeft size={18} /></button>
                        <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1.5 text-sm font-semibold rounded hover:bg-gray-100 text-gray-700 border border-gray-200">Today</button>
                        <button onClick={() => setCalendarDate(new Date(year, month + 1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-600"><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 border border-gray-200 flex-1 min-h-[500px] rounded-lg overflow-hidden bg-gray-50/50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="px-2 py-3 border-b border-r border-gray-200 font-bold text-center text-xs text-gray-500 uppercase tracking-widest bg-gray-100">
                            {day}
                        </div>
                    ))}
                    
                    {prevMonthDays.map(d => (
                        <div key={`prev-${d}`} className="min-h-[100px] p-1 border-b border-r border-gray-200 bg-gray-50/50 opacity-40"></div>
                    ))}
                    
                    {days.map(day => {
                        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const daySessions = filteredSessions.filter(s => s.start_date?.startsWith(dateString));
                        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                        
                        return (
                            <div key={day} className={`min-h-[100px] p-1 border-b border-r border-gray-200 bg-white hover:bg-blue-50/30 transition-colors ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
                                <div className="text-right">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>{day}</span>
                                </div>
                                <div className="mt-1 flex flex-col gap-1 px-1">
                                    {daySessions.map(session => (
                                        <div 
                                            key={session.id} 
                                            onClick={(e) => { e.stopPropagation(); handleOpenPanel(session); }}
                                            className={`text-[10px] p-1 leading-tight rounded cursor-pointer border hover:shadow-sm truncate font-medium whitespace-nowrap overflow-hidden text-ellipsis ${
                                                session.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                                session.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}
                                            title={session.title}
                                        >
                                            <span className="font-bold mr-1">{session.start_time || 'All Day'}</span>
                                            {session.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Padding for end of month */}
                    {Array.from({ length: Math.max(0, 42 - (firstDay + daysInMonth)) }).map((_, i) => (
                        <div key={`next-${i}`} className="min-h-[100px] p-1 border-b border-r border-gray-200 bg-gray-50/50 opacity-40"></div>
                    ))}
                </div>
            </div>
        );
    };

    // --- Timeline View ---
    const renderTimelineView = () => {
        // Sort sessions strictly by date
        const sorted = [...filteredSessions].sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime());
        
        return (
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-10">
                <div className="max-w-4xl mx-auto">
                    <div className="relative border-l-2 border-blue-200 ml-4 py-4 space-y-8">
                        {sorted.map((session, i) => {
                            if (!session.start_date) return null;
                            const dateObj = new Date(session.start_date);
                            const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                            const dayStr = String(dateObj.getDate()).padStart(2, '0');
                            
                            // Show month header if it's the first item or month changed
                            const prevDateStr = i > 0 && sorted[i-1].start_date ? new Date(sorted[i-1].start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
                            const showMonthHeader = monthStr !== prevDateStr;

                            return (
                                <div key={session.id || i}>
                                    {showMonthHeader && (
                                        <div className="mb-6 -ml-[9px] flex items-center">
                                            <div className="w-4 h-4 bg-blue-500 rounded-full border-4 border-gray-50 flex-shrink-0 shadow-sm"></div>
                                            <h3 className="ml-4 text-xs font-black text-gray-500 uppercase tracking-widest">{monthStr}</h3>
                                        </div>
                                    )}
                                    <div 
                                        onClick={() => handleOpenPanel(session)}
                                        className="relative pl-8 group cursor-pointer"
                                    >
                                        <div className={`absolute top-1/2 -translate-y-1/2 -left-[5px] w-2.5 h-2.5 rounded-full border-2 border-white transition-all duration-300 group-hover:scale-150 ${session.status === 'completed' ? 'bg-emerald-500' : session.status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                                        
                                        <div className="bg-white border text-left border-gray-200 rounded-xl p-4 shadow-sm group-hover:shadow-md group-hover:border-blue-300 transition-all">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex flex-col items-center justify-center p-2 bg-blue-50 rounded-lg min-w-[50px]">
                                                        <span className="text-xl font-bold text-blue-700 leading-none">{dayStr}</span>
                                                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{session.title}</h4>
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${STATUS_STYLES[session.status]}`}>
                                                                {session.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 line-clamp-2 pr-6">
                                                            {session.description ? <div dangerouslySetInnerHTML={{__html: session.description}} /> : 'No description provided.'}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="hidden md:flex flex-col gap-2 shrink-0 md:min-w-[140px]">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                        <UserIcon size={12} className="text-blue-400" />
                                                        {session.owner_name || 'Unassigned'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                        <Clock size={12} className="text-amber-500" />
                                                        {session.start_time} - {session.end_time}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                        <Hash size={12} className="text-purple-400" />
                                                        {session.training_type || 'Training'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {sorted.length === 0 && (
                            <div className="pl-6 text-gray-400 italic font-medium">No sessions scheduled for this period.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            {/* Glossy Header (Simplified for spreadsheet style) */}
            <div className="shrink-0 border-b border-gray-300 bg-white">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                    <div className="flex items-center gap-3">
                        <CalendarDays size={22} className="text-white/90" />
                        <h1 className="text-lg font-bold text-white tracking-wide">Training Calendar</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggles */}
                        <div className="flex items-center p-1 bg-white/20 rounded-md mr-2">
                            <button
                                onClick={() => setCurrentView('list')}
                                className={`p-1.5 rounded-sm flex items-center gap-1 text-xs font-semibold overflow-hidden transition-all ${currentView === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                            >
                                <List size={14} />
                                {currentView === 'list' && <span>List</span>}
                            </button>
                            <button
                                onClick={() => setCurrentView('calendar')}
                                className={`p-1.5 rounded-sm flex items-center gap-1 text-xs font-semibold overflow-hidden transition-all ${currentView === 'calendar' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                            >
                                <Calendar size={14} />
                                {currentView === 'calendar' && <span>Month</span>}
                            </button>
                            <button
                                onClick={() => setCurrentView('timeline')}
                                className={`p-1.5 rounded-sm flex items-center gap-1 text-xs font-semibold overflow-hidden transition-all ${currentView === 'timeline' ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                            >
                                <GitCommit size={14} />
                                {currentView === 'timeline' && <span>Timeline</span>}
                            </button>
                        </div>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-md transition-colors font-medium"
                        >
                            <Download size={14} />
                            Export CSV
                        </button>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-[#2563eb] rounded-md hover:bg-blue-50 transition-colors font-bold shadow-sm"
                        >
                            <Plus size={16} />
                            New Training
                        </button>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search grades, details, owner..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white text-gray-900"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Filter size={14} />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
                        />
                        {dateFilter && (
                            <button onClick={() => setDateFilter('')} className="ml-1 text-xs text-red-500 hover:text-red-700 underline">
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    {loading ? (
                        <div className="flex-1 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
                            <Calendar size={48} className="mb-3 opacity-50" />
                            <p className="text-lg font-medium text-gray-500">No training sessions found</p>
                            <button
                                onClick={handleCreate}
                                className="mt-5 flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] font-medium text-sm transition-colors"
                            >
                                <Plus size={16} /> Create Training
                            </button>
                        </div>
                    ) : currentView === 'calendar' ? (
                        renderCalendarView()
                    ) : currentView === 'timeline' ? (
                        renderTimelineView()
                    ) : (
                        <>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full border-collapse text-xs" style={{ minWidth: 1400 }}>
                                    <thead className="sticky top-0 z-10">
                                        <tr style={{ background: '#2563eb' }}>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-10">#</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-24">Grades</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 min-w-[200px]">Training Details</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-28">Mode</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-32">Type</th>
                                            <th className="px-2 py-2 text-center font-bold text-white uppercase tracking-wider border-r border-white/20 w-16">Seq</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-16">Days</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-24">Date</th>
                                            <th className="px-2 py-2 text-center font-bold text-white uppercase tracking-wider border-r border-white/20 w-20">No. Days</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-40">Owner</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 w-32">Timing</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 min-w-[150px]">Comments</th>
                                            <th className="px-2 py-2 text-left font-bold text-white uppercase tracking-wider border-r border-white/20 min-w-[150px]">Gap Reason</th>
                                            <th className="px-2 py-2 text-center font-bold text-white uppercase tracking-wider border-r border-white/20 w-24">Status</th>
                                            <th className="px-2 py-2 text-center font-bold text-white uppercase tracking-wider w-20">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSessions.map((s, idx) => {
                                            const isSelected = selectedRowId === s.id;
                                            return (
                                                <tr
                                                    key={s.id}
                                                    onClick={() => handleOpenPanel(s)}
                                                    className={`cursor-pointer border-b border-gray-200 transition-colors group ${
                                                        isSelected ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <td className="px-2 py-2 text-gray-400 font-mono text-center border-r border-gray-200">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 font-medium text-gray-900">
                                                        {s.grades || '-'}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 font-semibold text-gray-900">
                                                        <div className="flex items-center justify-between">
                                                            <span className="truncate">{s.title}</span>
                                                            <Edit3 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-600">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            s.mode === 'Offline' ? 'bg-amber-100 text-amber-700' : 
                                                            s.mode === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                        }`}>
                                                            {s.mode || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-600">
                                                        {s.training_type || s.category || '-'}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-center font-bold text-gray-500">
                                                        {s.sequence || '-'}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-600 font-medium">
                                                        {getDayName(s.start_date)}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-600 font-mono">
                                                        {s.start_date ? new Date(s.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-center font-bold text-blue-600">
                                                        {s.no_of_days || '1'}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-700 font-medium">
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <UserIcon size={12} className="text-blue-500 shrink-0" />
                                                            <span>{s.owner_name || employees.find(e => e.id === s.owner_id)?.full_name || 'Unassigned'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-500 font-mono">
                                                        {s.start_time} - {s.end_time}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-500 italic">
                                                        <span className="line-clamp-1">{s.comments || '-'}</span>
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-gray-500 italic">
                                                        <span className="line-clamp-1">{s.gap_reason || '-'}</span>
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-gray-200 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[s.status]}`}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={(e) => { e.stopPropagation(); handleOpenPanel(s); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                                                <ChevronRight size={16} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); if (s.id) handleDelete(s.id); }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Status Bar */}
                            <div className="shrink-0 flex items-center justify-between px-4 py-1 bg-gray-800 text-white text-[10px]">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1"><Hash size={10} /> <strong>{filteredSessions.length}</strong> Sessions</span>
                                    <span className="opacity-40">|</span>
                                    <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" /> {filteredSessions.filter(s => s.status === 'completed').length} Completed</span>
                                    <span className="opacity-40">|</span>
                                    <span className="flex items-center gap-1"><Clock size={10} className="text-blue-400" /> {filteredSessions.filter(s => s.status === 'scheduled').length} Scheduled</span>
                                </div>
                                <span className="opacity-60">Professional Training Management System v2.0</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Detail Panel */}
                {panelSession && (
                    <div className="w-[85%] max-w-6xl shrink-0 border-l border-gray-300 bg-white flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
                        {/* Panel Header */}
                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-blue-600">
                            <input
                                type="text"
                                value={panelSession.title || ''}
                                onChange={e => setPanelSession(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Training Title..."
                                className="bg-transparent text-white font-bold text-lg outline-none placeholder-white/50 w-full"
                            />
                            <button onClick={() => { setPanelSession(null); setSelectedRowId(null); }} className="ml-4 p-1 hover:bg-white/10 rounded-lg text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Panel Meta Grid */}
                        <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 px-6 py-6 border-b border-gray-200 bg-gray-50/80">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grades</label>
                                <input
                                    type="text"
                                    value={panelSession.grades || ''}
                                    placeholder="e.g. H1, H2"
                                    onChange={e => setPanelSession(prev => ({ ...prev, grades: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode</label>
                                <select
                                    value={panelSession.mode || 'Online'}
                                    onChange={e => setPanelSession(prev => ({ ...prev, mode: e.target.value as any }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</label>
                                <input
                                    type="text"
                                    value={panelSession.training_type || ''}
                                    placeholder="e.g. Pedagogy"
                                    onChange={e => setPanelSession(prev => ({ ...prev, training_type: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                                <input
                                    type="date"
                                    value={panelSession.start_date || ''}
                                    onChange={e => setPanelSession(prev => ({ ...prev, start_date: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. of Days</label>
                                <input
                                    type="number"
                                    value={panelSession.no_of_days || 1}
                                    onChange={e => setPanelSession(prev => ({ ...prev, no_of_days: parseInt(e.target.value) }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In-charge (Owner)</label>
                                <select
                                    value={panelSession.owner_id || ''}
                                    onChange={e => {
                                        const emp = employees.find(x => x.id === e.target.value);
                                        setPanelSession(prev => ({ ...prev, owner_id: e.target.value, owner_name: emp ? emp.full_name : '' }));
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Select In-charge...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Timing and Location */}
                        <div className="shrink-0 grid grid-cols-1 md:grid-cols-4 gap-6 px-6 py-4 bg-gray-50/30 border-b border-gray-200">
                             <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sequence</label>
                                <input
                                    type="number"
                                    value={panelSession.sequence || 1}
                                    onChange={e => setPanelSession(prev => ({ ...prev, sequence: parseInt(e.target.value) }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
                                />
                            </div>
                            <div className="flex flex-col gap-1 col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Timing</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={panelSession.start_time || '09:00'}
                                        onChange={e => setPanelSession(prev => ({ ...prev, start_time: e.target.value }))}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                                    />
                                    <span className="text-gray-400">to</span>
                                    <input
                                        type="time"
                                        value={panelSession.end_time || '10:00'}
                                        onChange={e => setPanelSession(prev => ({ ...prev, end_time: e.target.value }))}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={10} /> Location</label>
                                <input
                                    type="text"
                                    value={panelSession.location || ''}
                                    placeholder="Room name or platform"
                                    onChange={e => setPanelSession(prev => ({ ...prev, location: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><LinkIcon size={10} /> Meeting Link</label>
                                <input
                                    type="text"
                                    value={panelSession.meeting_link || ''}
                                    placeholder="https://"
                                    onChange={e => setPanelSession(prev => ({ ...prev, meeting_link: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><FileText size={12} /> Training Details (Description)</label>
                                    <div className="border border-gray-200 rounded-xl min-h-[300px] overflow-hidden">
                                        <RichTextEditor
                                            value={panelSession.description || ''}
                                            onChange={v => setPanelSession(prev => ({ ...prev, description: v }))}
                                            placeholder="Detailed content of the training..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Edit3 size={12} /> Comments</label>
                                        <textarea
                                            rows={4}
                                            value={panelSession.comments || ''}
                                            onChange={e => setPanelSession(prev => ({ ...prev, comments: e.target.value }))}
                                            placeholder="General comments or observations..."
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 resize-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12} /> Reason for gaps in training dates</label>
                                        <textarea
                                            rows={4}
                                            value={panelSession.gap_reason || ''}
                                            onChange={e => setPanelSession(prev => ({ ...prev, gap_reason: e.target.value }))}
                                            placeholder="Explain why there are gaps between training dates if any..."
                                            className="w-full px-4 py-3 border border-rose-100 bg-rose-50/20 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/10 resize-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">Status</label>
                                        <div className="flex gap-2">
                                            {(['scheduled', 'completed', 'cancelled'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => setPanelSession(prev => ({ ...prev, status: s }))}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
                                                        panelSession.status === s ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Panel Footer */}
                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => { setPanelSession(null); setSelectedRowId(null); }}
                                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20"
                            >
                                <Save size={18} />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
