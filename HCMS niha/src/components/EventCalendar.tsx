import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    AlertCircle,
    CheckCircle2,
    X,
    Trash2,
    Edit2
} from 'lucide-react';
import { User, CalendarEvent } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';

interface Props {
    currentUser: User;
}

type CalendarView = 'month' | 'week' | 'day';

export default function EventCalendar({ currentUser }: Props) {
    const [view, setView] = useState<CalendarView>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'event' as CalendarEvent['type'],
        start_date: '',
        start_time: '09:00',
        end_date: '',
        end_time: '10:00',
        is_all_day: false,
        reminder_at: '',
        status: 'pending' as CalendarEvent['status']
    });

    useEffect(() => {
        loadEvents();
    }, [currentUser.id]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const data = await db.find<CalendarEvent>(Collections.EVENTS, { user_id: currentUser.id });
            setEvents(data || []);
        } catch (error) {
            console.error('Error loading events:', error);
        }
        setLoading(false);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();

        const start = new Date(`${formData.start_date}T${formData.start_time}`);
        const end = new Date(`${formData.end_date || formData.start_date}T${formData.end_time}`);

        const eventData: any = {
            user_id: currentUser.id!,
            title: formData.title,
            description: formData.description,
            type: formData.type,
            start_date: start.toISOString(),
            is_all_day: formData.is_all_day,
            status: formData.status,
            updated_at: new Date().toISOString()
        };

        if (formData.end_date) {
            eventData.end_date = end.toISOString();
        }

        if (formData.reminder_at) {
            eventData.reminder_at = new Date(formData.reminder_at).toISOString();
        }

        try {
            if (editingEvent?.id) {
                await db.updateById(Collections.EVENTS, editingEvent.id, eventData);
            } else {
                await db.insertOne(Collections.EVENTS, {
                    ...eventData,
                    created_at: new Date().toISOString()
                } as CalendarEvent);
            }
            setShowModal(false);
            setEditingEvent(null);
            resetForm();
            loadEvents();
        } catch (error) {
            console.error('Error saving event:', error);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            await db.deleteById(Collections.EVENTS, id);
            loadEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const resetForm = () => {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
            title: '',
            description: '',
            type: 'event',
            start_date: today,
            start_time: '09:00',
            end_date: today,
            end_time: '10:00',
            is_all_day: false,
            reminder_at: '',
            status: 'pending'
        });
    };

    const openAddModal = (date?: Date) => {
        resetForm();
        if (date) {
            const dateStr = date.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, start_date: dateStr, end_date: dateStr }));
        }
        setEditingEvent(null);
        setShowModal(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        const start = new Date(event.start_date);
        const end = event.end_date ? new Date(event.end_date) : start;

        setFormData({
            title: event.title,
            description: event.description || '',
            type: event.type,
            start_date: start.toISOString().split('T')[0],
            start_time: start.toTimeString().slice(0, 5),
            end_date: end.toISOString().split('T')[0],
            end_time: end.toTimeString().slice(0, 5),
            is_all_day: event.is_all_day,
            reminder_at: event.reminder_at ? event.reminder_at.slice(0, 16) : '',
            status: event.status
        });
        setEditingEvent(event);
        setShowModal(true);
    };

    // Calendar Logic
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const getDayEvents = (date: Date) => {
        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        return events.filter(e => e.start_date.startsWith(dateStr));
    };

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);
        const days = [];

        // Padding for first day
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`pad-${i}`} className="h-32 bg-gray-50 border border-gray-100"></div>);
        }

        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(year, month, i);
            const dayEvents = getDayEvents(date);
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <div
                    key={i}
                    className={`h-32 border border-gray-100 p-2 transition-colors hover:bg-gray-50 relative group ${isToday ? 'bg-blue-50' : 'bg-white'}`}
                    onClick={() => openAddModal(date)}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-semibold ${isToday ? 'text-blue-600 bg-blue-100 w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-700'}`}>
                            {i}
                        </span>
                        <button
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-500"
                            onClick={(e) => { e.stopPropagation(); openAddModal(date); }}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-20 scrollbar-hide">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer shadow-sm border ${event.type === 'task' ? 'bg-green-100 text-green-700 border-green-200' :
                                    event.type === 'note' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                        'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}
                                onClick={(e) => { e.stopPropagation(); openEditModal(event); }}
                            >
                                {event.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-7 border-collapse">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center py-2 text-sm font-bold text-gray-500 border-b border-gray-200 bg-gray-50 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
                {days}
            </div>
        );
    };

    const renderListView = (days: number) => {
        const listDays = [];
        const baseDate = new Date(currentDate);

        if (view === 'week') {
            const day = baseDate.getDay();
            baseDate.setDate(baseDate.getDate() - day);
        }

        for (let i = 0; i < days; i++) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() + i);
            const dayEvents = getDayEvents(date);
            const isToday = new Date().toDateString() === date.toDateString();

            listDays.push(
                <div key={i} className={`p-4 border-b border-gray-100 ${isToday ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 ${isToday ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 bg-white text-gray-900'}`}>
                            <span className="text-xs font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className="text-xl font-bold">{date.getDate()}</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
                            {isToday && <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Today</span>}
                        </div>
                        <button
                            onClick={() => openAddModal(date)}
                            className="ml-auto p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm transition-all"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="ml-0 md:ml-18 space-y-3">
                        {dayEvents.length > 0 ? dayEvents.map(event => (
                            <div
                                key={event.id}
                                onClick={() => openEditModal(event)}
                                className={`group flex items-center gap-4 p-3 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-md ${event.type === 'task' ? 'bg-green-50 border-green-500 hover:bg-green-100' :
                                    event.type === 'note' ? 'bg-yellow-50 border-yellow-500 hover:bg-yellow-100' :
                                        'bg-blue-50 border-blue-500 hover:bg-blue-100'
                                    }`}
                            >
                                <div className={`p-2 rounded-lg ${event.type === 'task' ? 'bg-green-100 text-green-600' :
                                    event.type === 'note' ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-blue-100 text-blue-600'
                                    }`}>
                                    {event.type === 'task' ? <CheckCircle2 size={18} /> :
                                        event.type === 'note' ? <AlertCircle size={18} /> :
                                            <Clock size={18} />}
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-gray-900">{event.title}</h5>
                                    <p className="text-sm text-gray-600 line-clamp-1">{event.description || 'No description'}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                        <Clock size={12} />
                                        <span>{new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {event.is_all_day && <span className="bg-gray-200 px-1.5 py-0.5 rounded ml-2">All Day</span>}
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(event); }}
                                        className="p-1.5 hover:bg-white rounded-lg text-gray-500 transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id!); }}
                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-400 italic py-2 pl-4">No events scheduled</p>
                        )}
                    </div>
                </div>
            );
        }

        return <div className="divide-y divide-gray-100">{listDays}</div>;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
                            <CalendarIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Event Calendar</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Manage your tasks, events and reminders</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            {(['month', 'week', 'day'] as CalendarView[]).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => openAddModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                            <span>Add Event</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-gray-900">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex gap-1">
                            <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft size={20} /></button>
                            <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight size={20} /></button>
                        </div>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    view === 'month' ? renderMonthView() :
                        view === 'week' ? renderListView(7) :
                            renderListView(1)
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 text-left">Title</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="What is happening?"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {(['event', 'task', 'note'] as CalendarEvent['type'][]).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                                        className={`py-2 px-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${formData.type === t
                                            ? (t === 'event' ? 'bg-blue-50 border-blue-500 text-blue-700' :
                                                t === 'task' ? 'bg-green-50 border-green-500 text-green-700' :
                                                    'bg-yellow-50 border-yellow-500 text-yellow-700')
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5 text-left">Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value, end_date: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                    />
                                </div>
                                {!formData.is_all_day && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 text-left">Time</label>
                                        <input
                                            required
                                            type="time"
                                            value={formData.start_time}
                                            onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 text-left">Description (Optional)</label>
                                <textarea
                                    rows={3}
                                    placeholder="More details..."
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="is_all_day"
                                    checked={formData.is_all_day}
                                    onChange={e => setFormData(prev => ({ ...prev, is_all_day: e.target.checked }))}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="is_all_day" className="text-sm font-bold text-blue-900 cursor-pointer select-none">All Day Event</label>
                            </div>

                            <div className="mt-8 flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    {editingEvent ? 'Save Changes' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
