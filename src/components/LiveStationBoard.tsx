import { useState, useEffect } from 'react';
import { User, EmployeeTask } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Train } from 'lucide-react';

interface StationRecord {
    employeeId: string;
    employeeName: string;
    progress: number;
    tasksCount: number;
    status: 'on_time' | 'behind' | 'arrived' | 'stalled';
}

export default function LiveStationBoard() {
    const [records, setRecords] = useState<StationRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const calculateStatus = (progress: number): StationRecord['status'] => {
        if (progress >= 100) return 'arrived';
        const now = new Date();
        const currentHour = now.getHours();
        const dayStart = 9 * 60;
        const dayEnd = 17 * 60;
        const totalWorkMinutes = dayEnd - dayStart;
        const currentWorkMinutes = Math.min(Math.max((currentHour * 60 + now.getMinutes()) - dayStart, 0), totalWorkMinutes);
        const expectedProgress = (currentWorkMinutes / totalWorkMinutes) * 100;

        if (progress < expectedProgress - 15) return 'behind';
        if (progress === 0 && currentHour >= 10) return 'stalled';
        return 'on_time';
    };

    const loadGlobalData = async () => {
        const today = new Date().toISOString().split('T')[0];
        const employees = await db.find<User>(Collections.USERS, { role: 'employee', is_active: true });
        if (!employees) return;

        const allTasks = await db.find<EmployeeTask>(Collections.EMPLOYEE_TASKS, { date: today });

        const newRecords: StationRecord[] = employees.map(emp => {
            const empTasks = allTasks.filter(t => t.employee_id === emp.id);
            const completedTasks = empTasks.filter(t => t.status === 'completed');
            const progress = empTasks.length > 0 ? (completedTasks.length / empTasks.length) * 100 : 0;

            return {
                employeeId: emp.id!,
                employeeName: emp.full_name.split(' ')[0], // Compact name
                progress: Math.round(progress),
                tasksCount: empTasks.length,
                status: calculateStatus(progress)
            };
        });

        setRecords(newRecords.sort((a, b) => b.progress - a.progress));
        setLoading(false);
    };

    useEffect(() => {
        loadGlobalData();
        const interval = setInterval(loadGlobalData, 120000);
        return () => clearInterval(interval);
    }, []);

    if (loading || records.length === 0) return null;

    return (
        <div className="bg-[#0f172a]/95 backdrop-blur-sm rounded-lg border border-amber-500/30 shadow-2xl overflow-hidden mb-6 animate-fade-in w-full max-w-2xl self-start">
            <div className="flex bg-black/40 px-3 py-1.5 items-center gap-3">
                <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                    <Train className="text-amber-500" size={12} />
                    <span className="text-amber-500 font-black text-[9px] uppercase tracking-[0.2em] whitespace-nowrap">Live Signal</span>
                </div>

                {/* Horizontal Scrolling Ticker */}
                <div className="flex-1 overflow-hidden relative">
                    <div className="flex items-center gap-4 animate-ticker whitespace-nowrap py-0.5">
                        {records.map((record) => (
                            <div key={record.employeeId} className="flex items-center gap-2 group cursor-help">
                                <div className={`w-1.5 h-1.5 rounded-full ${record.status === 'arrived' ? 'bg-green-500' :
                                        record.status === 'behind' ? 'bg-red-500' :
                                            'bg-amber-500'
                                    } shadow-[0_0_5px_currentColor]`}></div>

                                <span className="text-white font-bold text-[10px] tracking-tight">{record.employeeName}</span>

                                <span className={`text-[9px] font-mono ${record.status === 'arrived' ? 'text-green-400' :
                                        record.status === 'behind' ? 'text-red-400' :
                                            'text-amber-400'
                                    }`}>{record.progress}%</span>

                                <div className="w-8 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${record.status === 'arrived' ? 'bg-green-500' :
                                                record.status === 'behind' ? 'bg-red-500' :
                                                    'bg-amber-500'
                                            }`}
                                        style={{ width: `${record.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-amber-500 font-mono text-[9px] font-black tracking-tighter tabular-nums pl-3 border-l border-white/10">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <style>{`
                @keyframes ticker {
                    0% { transform: translateX(10%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-ticker {
                    animation: ticker 25s linear infinite;
                    display: inline-flex;
                }
                .animate-ticker:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}
