import { useState, useEffect, useRef } from 'react';
import { User, ChatSession, Teacher } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { MessageSquare, Users, Search, PlusCircle } from 'lucide-react';
import ChatWindow from './ChatWindow';

interface Props {
    currentUser: User;
}

export default function EmployeeChatDashboard({ currentUser }: Props) {
    const [sessions, setSessions] = useState<(ChatSession & { otherParty?: Teacher | User | null })[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedOtherName, setSelectedOtherName] = useState<string>('');

    // Contact List State
    const [viewMode, setViewMode] = useState<'chats' | 'contacts'>('chats');
    const [contactType, setContactType] = useState<'teachers' | 'employees'>('teachers');
    const [searchTerm, setSearchTerm] = useState('');
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [allEmployees, setAllEmployees] = useState<User[]>([]);

    // Refs so processSessions always has fresh teacher/employee data (avoids stale closure)
    const allTeachersRef = useRef<Teacher[]>([]);
    const allEmployeesRef = useRef<User[]>([]);
    const rawSessionsRef = useRef<{ outgoing: ChatSession[], incoming: ChatSession[] }>({ outgoing: [], incoming: [] });

    useEffect(() => {
        setLoading(true);
        // 1. Subscribe to sessions where I am the 'employee_id' (Standard teacher chats + My outgoing employee chats)
        const unsubscribe1 = db.subscribe<ChatSession>(
            Collections.CHAT_SESSIONS,
            { employee_id: currentUser.id },
            async (outgoingData) => {
                handleSessionUpdate(outgoingData, 'outgoing');
            }
        );

        // 2. Subscribe to sessions where I am the 'target_employee_id' (Incoming employee chats)
        const unsubscribe2 = db.subscribe<ChatSession>(
            Collections.CHAT_SESSIONS,
            { target_employee_id: currentUser.id },
            async (incomingData) => {
                handleSessionUpdate(incomingData, 'incoming');
            }
        );

        // Fetch contacts for the "New Chat" list
        fetchContacts();

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, [currentUser.id]);

    // Helper to merge and enrich sessions from both subscriptions
    const [, setRawSessions] = useState<{ outgoing: ChatSession[], incoming: ChatSession[] }>({ outgoing: [], incoming: [] });

    const handleSessionUpdate = (data: ChatSession[], type: 'outgoing' | 'incoming') => {
        const newState = { ...rawSessionsRef.current, [type]: data };
        rawSessionsRef.current = newState;
        setRawSessions(newState);
        processSessions(newState.outgoing, newState.incoming);
    };

    // Re-process sessions when contacts load (race condition fix)
    useEffect(() => {
        if (allTeachers.length > 0 || allEmployees.length > 0) {
            processSessions(rawSessionsRef.current.outgoing, rawSessionsRef.current.incoming);
        }
    }, [allTeachers, allEmployees]);

    const processSessions = async (outgoing: ChatSession[], incoming: ChatSession[]) => {
        // Merge and deduplicate by ID
        const allSessions = [...outgoing, ...incoming];
        const uniqueSessions = Array.from(new Map(allSessions.map(s => [s.id, s])).values());

        // Sort by last message time
        const sorted = uniqueSessions.sort((a, b) => {
            const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return timeB - timeA;
        });

        // Build lookup maps from already-loaded contacts (avoids extra Firestore reads)
        const teacherCacheMap = new Map<string, Teacher>();
        allTeachersRef.current.forEach(t => {
            if (t.id) teacherCacheMap.set(t.id, t);
        });

        console.log('[DEBUG] Teacher cache size:', teacherCacheMap.size, 'Teachers in ref:', allTeachersRef.current.length);
        console.log('[DEBUG] First 3 teacher IDs in cache:', [...teacherCacheMap.keys()].slice(0, 3));

        const employeeCacheMap = new Map<string, User>();
        allEmployeesRef.current.forEach(e => { if (e.id) employeeCacheMap.set(e.id, e); });
        // Also include current user in case they appear as one side
        if (currentUser.id) employeeCacheMap.set(currentUser.id, currentUser);

        // Enrich sessions — use cache first, only fallback to Firestore if cache misses
        const enriched = await Promise.all(sorted.map(async (session) => {
            let otherParty: Teacher | User | null = null;

            if (session.type === 'employee_employee') {
                const otherId = session.employee_id === currentUser.id
                    ? session.target_employee_id
                    : session.employee_id;
                if (otherId) {
                    otherParty = employeeCacheMap.get(otherId) || await db.findById<User>(Collections.USERS, otherId);
                }
            } else if (session.type !== 'technical_support') {
                if (session.teacher_id) {
                    // Use cache (both by Firestore doc ID and by id field)
                    otherParty = teacherCacheMap.get(session.teacher_id) || null;
                    
                    if (!otherParty) {
                        console.log('[DEBUG] Teacher NOT in cache. session.teacher_id =', session.teacher_id, 'session.type =', session.type, 'session.id =', session.id);
                        // Firestore fallback
                        otherParty = await db.findById<Teacher>(Collections.TEACHERS, session.teacher_id)
                            .catch(() => null);
                        console.log('[DEBUG] findById result:', otherParty ? `${otherParty.first_name} ${otherParty.last_name}` : 'NULL');
                    }
                    if (!otherParty) {
                        otherParty = await db.findOne<Teacher>(Collections.TEACHERS, { id: session.teacher_id })
                            .catch(() => null);
                        console.log('[DEBUG] findOne by id field result:', otherParty ? `${otherParty.first_name} ${otherParty.last_name}` : 'NULL');
                    }
                } else {
                    console.log('[DEBUG] Session has NO teacher_id. session.type =', session.type, 'session =', JSON.stringify(session));
                }
            }
            return { ...session, otherParty };
        }));

        setSessions(enriched);
        setLoading(false);
    };

    const fetchContacts = async () => {
        // Load active teachers
        const teachers = await db.find<Teacher>(Collections.TEACHERS, { status: 'active' });
        allTeachersRef.current = teachers;
        setAllTeachers(teachers);

        const employees = await db.find<User>(Collections.USERS, { role: 'employee', is_active: true });
        const filtered = employees.filter(e => e.id !== currentUser.id);
        allEmployeesRef.current = filtered;
        // Exclude self
        setAllEmployees(filtered);
    };

    const handleStartChat = async (contact: Teacher | User, type: 'teacher' | 'employee') => {
        // Check if session already exists
        let existingSession = sessions.find(s => {
            if (type === 'teacher') {
                return s.teacher_id === contact.id;
            } else {
                return (s.employee_id === currentUser.id && s.target_employee_id === contact.id) ||
                    (s.employee_id === contact.id && s.target_employee_id === currentUser.id);
            }
        });

        if (existingSession) {
            setSelectedSessionId(existingSession.id!);
            setSelectedOtherName(type === 'teacher' ? `${(contact as Teacher).first_name} ${(contact as Teacher).last_name}` : (contact as User).full_name);
            setViewMode('chats');
            return;
        }

        // Create new session
        const newSessionData: any = {
            employee_id: currentUser.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unread_count_employee: 0,
            unread_count_teacher: 0, // generic unread field, reused for target user in employee chat
            last_message: '',
        };

        if (type === 'teacher') {
            const teacher = contact as Teacher;
            newSessionData.teacher_id = teacher.id;
            newSessionData.school_id = teacher.school_id || ''; // Ideally should exist
            newSessionData.type = 'teacher_employee';
        } else {
            const employee = contact as User;
            newSessionData.target_employee_id = employee.id;
            newSessionData.type = 'employee_employee';
        }

        try {
            await db.insertOne(Collections.CHAT_SESSIONS, newSessionData);
            // Manually add to list to allow immediate selection (subscription will update shortly)

            // Re-fetch to confirm? Or just rely on subscription. Subscription is safer.
            // But we can eagerly select.
            // We need to wait for subscription to give us the full enriched object, 
            // but for now we can simulate selection

            // Actually, waiting for subscription is best user experience if fast enough. 
            // But let's force a select once we find it index.
            // For now, let's just switch view back to chats and let the user see it appear.
            setViewMode('chats');
            // We can select it once it appears in state, but handling that race is tricky.
            // Simpler: Just go to chats list.
        } catch (error) {
            console.error("Error creating chat session:", error);
            alert("Failed to start chat");
        }
    };

    const filteredContacts = (contactType === 'teachers' ? allTeachers : allEmployees).filter(c => {
        const name = contactType === 'teachers'
            ? `${(c as Teacher).first_name} ${(c as Teacher).last_name}`
            : (c as User).full_name;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center px-1 md:px-0 mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Messages</h1>
                    <p className="text-xs md:text-sm text-gray-500 hidden md:block">Chat with teachers and colleagues</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 min-h-0 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-3 flex-1 min-h-0">
                    {/* Sidebar */}
                    <div className="border-r border-gray-200 flex flex-col min-h-0 overflow-hidden">
                        {/* View Switcher */}
                        <div className="p-4 border-b border-gray-100 flex gap-2">
                            <button
                                onClick={() => setViewMode('chats')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'chats' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <MessageSquare size={16} className="inline mr-2" />
                                Active Chats
                            </button>
                            <button
                                onClick={() => setViewMode('contacts')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'contacts' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Users size={16} className="inline mr-2" />
                                Contacts
                            </button>
                        </div>

                        {/* Chats List Mode */}
                        {viewMode === 'chats' && (
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 text-center text-gray-500">Loading...</div>
                                ) : sessions.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No active conversations</p>
                                        <button
                                            onClick={() => setViewMode('contacts')}
                                            className="mt-4 text-blue-600 hover:underline text-sm"
                                        >
                                            Start a new chat
                                        </button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {sessions.map((session) => {
                                            const name = session.type === 'technical_support'
                                                ? 'Admin Support'
                                                : session.otherParty
                                                    ? (session.type === 'employee_employee'
                                                        ? (session.otherParty as User).full_name
                                                        : `${(session.otherParty as Teacher).first_name} ${(session.otherParty as Teacher).last_name}`)
                                                    : 'Deleted User';

                                            return (
                                                <button
                                                    key={session.id}
                                                    onClick={() => {
                                                        setSelectedSessionId(session.id!);
                                                        setSelectedOtherName(name);
                                                    }}
                                                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedSessionId === session.id ? 'bg-blue-50' : ''
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                            {name}
                                                            {session.type === 'employee_employee' && (
                                                                <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">Colleague</span>
                                                            )}
                                                        </h3>
                                                        {session.last_message_at && (
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(session.last_message_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 truncate mb-2">
                                                        {session.last_message || 'No messages yet'}
                                                    </p>
                                                    {session.unread_count_employee > 0 && (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                                                            {session.unread_count_employee} new
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contacts List Mode */}
                        {viewMode === 'contacts' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search contacts..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setContactType('teachers')}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${contactType === 'teachers' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Teachers
                                        </button>
                                        <button
                                            onClick={() => setContactType('employees')}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${contactType === 'employees' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Colleagues
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {filteredContacts.length === 0 ? (
                                        <p className="text-center text-gray-500 text-sm py-4">No contacts found</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {filteredContacts.map(contact => {
                                                const name = contactType === 'teachers'
                                                    ? `${(contact as Teacher).first_name} ${(contact as Teacher).last_name}`
                                                    : (contact as User).full_name;
                                                const subtext = contactType === 'teachers'
                                                    ? (contact as Teacher).subject_specialization
                                                    : 'Employee';

                                                return (
                                                    <button
                                                        key={contact.id}
                                                        onClick={() => handleStartChat(contact, contactType === 'teachers' ? 'teacher' : 'employee')}
                                                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg group flex items-center justify-between transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                                <span className="font-bold text-xs">{name.charAt(0)}</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-medium text-gray-900">{name}</h4>
                                                                <p className="text-xs text-gray-500">{subtext}</p>
                                                            </div>
                                                        </div>
                                                        <PlusCircle size={18} className="text-gray-300 group-hover:text-blue-600" />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className="col-span-2 bg-gray-50 flex flex-col min-h-0">
                        {selectedSessionId ? (
                            <ChatWindow
                                sessionId={selectedSessionId}
                                currentUserId={currentUser.id!}
                                currentUserType="employee"
                                otherUserName={selectedOtherName}
                                otherUserRole={
                                    sessions.find(s => s.id === selectedSessionId)?.type === 'employee_employee'
                                        ? 'employee'
                                        : 'teacher'
                                }
                                onClose={() => setSelectedSessionId(null)}
                                className="flex-1 min-h-0"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                <MessageSquare size={48} className="mb-4 opacity-20" />
                                <p>Select a conversation or start a new chat</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
