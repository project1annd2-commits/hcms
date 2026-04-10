import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TrainAnimationProps {
    progressEndTime?: number; // Minutes from midnight
    taskCount?: number;
}

const TrainAnimation = ({ progressEndTime, taskCount = 0 }: TrainAnimationProps) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const calculateProgress = () => {
            // 9 AM = 9 * 60 = 540 minutes
            // 5 PM = 17 * 60 = 1020 minutes
            const startMinutes = 9 * 60;
            const endMinutes = 17 * 60;
            const totalMinutes = endMinutes - startMinutes;

            let currentMinutes;

            if (progressEndTime && progressEndTime > 0) {
                // Use the provided task end time
                currentMinutes = progressEndTime;
            } else {
                // Use current time if no tasks, but only within 9-5
                const now = new Date();
                currentMinutes = now.getHours() * 60 + now.getMinutes();
            }

            let percentage = ((currentMinutes - startMinutes) / totalMinutes) * 100;

            // Clamp between 0 and 100
            percentage = Math.max(0, Math.min(100, percentage));

            setProgress(percentage);
        };

        calculateProgress();
        const timer = setInterval(calculateProgress, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [progressEndTime]);

    return (
        <div className="w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8 overflow-hidden relative">
            {/* Background Sky */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent -z-10"></div>

            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-red-600 rounded-lg shadow-red-200 shadow-lg">
                        <Clock className="text-white" size={20} />
                    </div>
                    <span className="tracking-tight font-black uppercase tracking-wider">HCMS EXPRESS</span>
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest text-[10px]">On Schedule</span>
                    </div>
                    <div className="bg-gray-900 text-white text-sm font-mono px-4 py-1.5 rounded-full shadow-lg border-b-2 border-red-500">
                        {Math.round(progress)}% Complete
                    </div>
                </div>
            </div>

            <div className="relative pt-24 pb-12 px-2">
                {/* The Track */}
                <div className="absolute bottom-16 left-0 right-0 h-4">
                    {/* Main Rail Bed */}
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gray-200 rounded-full"></div>
                    {/* Railroad Ties */}
                    <div className="absolute inset-x-0 bottom-0 h-full flex justify-between px-1">
                        {Array.from({ length: 48 }).map((_, i) => (
                            <div key={i} className="w-1 h-3 bg-gray-300 transform -skew-x-12 mt-1"></div>
                        ))}
                    </div>
                    {/* SOLID RAILS - The "Normal" look */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gray-400 opacity-60"></div>
                    <div className="absolute inset-x-0 bottom-1 h-0.5 bg-gray-400 opacity-60"></div>
                </div>

                {/* Progress Line */}
                <div className="absolute bottom-16 left-0 h-1 bg-red-600/20 transition-all duration-1000" style={{ width: `${progress}%` }}></div>

                {/* The FULL Train */}
                <div
                    className="absolute bottom-16 transform -translate-x-full transition-all duration-1000 ease-in-out z-10 flex items-end gap-1"
                    style={{ left: `${progress}%` }}
                >
                    {/* Boggies */}
                    {Array.from({ length: Math.min(taskCount, 15) }).map((_, i) => (
                        <div key={i} className="flex items-end transition-all animate-fade-in">
                            <div className="w-2 h-1 bg-gray-400 mb-6 shrink-0 rounded-full"></div>
                            <div className="relative w-16 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-lg border-b-4 border-red-800 shadow-md">
                                <div className="absolute inset-2 border border-white/20 rounded flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-white/30 tracking-widest">HCMS</span>
                                </div>
                                {/* Boggie Wheels */}
                                <div className="absolute -bottom-4 left-1 right-1 flex justify-between px-1">
                                    <div className="w-6 h-6 bg-gray-900 rounded-full border-2 border-gray-700 animate-spin-slow overflow-hidden flex items-center justify-center">
                                        <div className="w-full h-0.5 bg-gray-600 transform rotate-45"></div>
                                    </div>
                                    <div className="w-6 h-6 bg-gray-900 rounded-full border-2 border-gray-700 animate-spin-slow overflow-hidden flex items-center justify-center">
                                        <div className="w-full h-0.5 bg-gray-600 transform rotate-45"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Coupler to Engine */}
                    {taskCount > 0 && <div className="w-2 h-1 bg-gray-400 mb-6 shrink-0 rounded-full"></div>}

                    {/* NORMAL MODERN ENGINE */}
                    <div className="relative">
                        {/* Exhaust Pipe & Smoke */}
                        <div className="absolute -top-6 left-12 w-6 h-8 bg-gray-900 rounded-t-lg z-0 border-b-2 border-red-900">
                            {/* Vent Detail */}
                            <div className="absolute -top-1 left-1 right-1 h-1 bg-gray-700/50 rounded-full"></div>
                        </div>

                        {/* Dense Smoke Particles */}
                        <div className="absolute -top-16 left-12">
                            <div className="w-3 h-3 bg-gray-300 rounded-full blur-[2px] animate-smoke-1 opacity-0"></div>
                            <div className="w-5 h-5 bg-gray-200 rounded-full blur-[3px] animate-smoke-2 opacity-0 -ml-2"></div>
                            <div className="w-4 h-4 bg-gray-400 rounded-full blur-[4px] animate-smoke-3 opacity-0 ml-1"></div>
                            <div className="w-6 h-6 bg-gray-300 rounded-full blur-[5px] animate-smoke-1 opacity-0 -ml-3 delay-500"></div>
                        </div>

                        {/* Engine Body Container */}
                        <div className="flex items-end drop-shadow-2xl">
                            {/* Main Body */}
                            <div className="relative h-16 w-40 bg-gradient-to-br from-red-600 to-red-800 rounded-r-[40px] rounded-l-md border-b-4 border-red-900 shadow-lg">
                                {/* Front Headlight */}
                                <div className="absolute top-8 -right-1 w-3 h-4 bg-amber-400 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.8)] z-20 border border-amber-200 animate-blink">
                                    {/* Light Beam */}
                                    <div className="absolute top-1/2 left-full w-24 h-12 bg-gradient-to-r from-amber-400/40 to-transparent -translate-y-1/2 rounded-full blur-xl pointer-events-none opacity-60"></div>
                                </div>

                                {/* Driver's Cab / Cockpit */}
                                <div className="absolute top-2 right-4 w-28 h-10 bg-black/90 rounded-tr-[30px] rounded-bl-md overflow-hidden border-t border-r border-white/20">
                                    {/* Glass reflection */}
                                    <div className="absolute top-1 right-4 w-16 h-full bg-blue-400/20 skew-x-[-30deg] z-10 pointer-events-none"></div>

                                    {/* THE DRIVER */}
                                    <div className="absolute bottom-1 right-10 flex flex-col items-center">
                                        <div className="w-4 h-4 bg-orange-200 rounded-full border border-gray-900 z-10"></div> {/* Head */}
                                        <div className="w-6 h-5 bg-blue-600 rounded-t-lg border border-gray-900 -mt-1 shadow-inner"></div> {/* Shoulders */}
                                        {/* Hands on wheel feel */}
                                        <div className="absolute -right-2 top-4 w-1.5 h-1.5 bg-orange-200 rounded-full border border-gray-900"></div>
                                    </div>

                                    <div className="absolute top-1.5 left-4 text-[7px] font-bold text-red-500/80 tracking-[0.2em]">PLATFORM EXPRESS</div>
                                </div>

                                {/* Body Accents */}
                                <div className="absolute bottom-4 left-4 right-10 h-1 bg-white/10 rounded-full"></div>
                                <div className="absolute top-4 left-4 w-6 h-6 bg-white/5 rounded-md border border-white/10 flex items-center justify-center">
                                    <span className="text-[6px] text-white/40">H</span>
                                </div>

                                {/* Speed Lines */}
                                <div className="absolute -left-4 top-4 bottom-4 flex flex-col justify-center gap-2 opacity-20">
                                    <div className="w-3 h-0.5 bg-gray-400 animate-pulse"></div>
                                    <div className="w-5 h-0.5 bg-gray-400 animate-pulse delay-75"></div>
                                    <div className="w-2 h-0.5 bg-gray-400 animate-pulse delay-150"></div>
                                </div>
                            </div>

                            {/* Front Grille / Cowcatcher feel */}
                            <div className="absolute -bottom-1 right-2 w-12 h-4 bg-gray-900 rounded-full blur-[1px] -z-10"></div>
                        </div>

                        {/* Wheels Layer */}
                        <div className="absolute -bottom-5 left-1 right-1 flex justify-between px-2">
                            <div className="w-10 h-10 bg-gray-900 rounded-full border-[3px] border-gray-700 animate-spin-slow overflow-hidden flex items-center justify-center shadow-md">
                                <div className="w-full h-1 bg-gray-600/50 transform rotate-45"></div>
                                <div className="absolute w-2 h-2 bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="w-10 h-10 bg-gray-900 rounded-full border-[3px] border-gray-700 animate-spin-slow overflow-hidden flex items-center justify-center shadow-md">
                                <div className="w-full h-1 bg-gray-600/50 transform rotate-45"></div>
                                <div className="absolute w-2 h-2 bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="w-10 h-10 bg-gray-900 rounded-full border-[3px] border-gray-700 animate-spin-slow overflow-hidden flex items-center justify-center shadow-md">
                                <div className="w-full h-1 bg-gray-600/50 transform rotate-[135deg]"></div>
                                <div className="absolute w-2 h-2 bg-gray-800 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Benchmarks */}
                <div className="flex justify-between mt-12">
                    <div className="group text-center">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">09:00 AM</div>
                        <div className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-black shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:scale-105">DEP.</div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center px-10">
                        <div className="h-0.5 bg-gradient-to-r from-transparent via-gray-200 to-transparent w-full relative mb-1">
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Express Service</div>
                        </div>
                    </div>

                    <div className="group text-center">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">05:00 PM</div>
                        <div className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-xs font-black shadow-sm group-hover:bg-green-600 group-hover:text-white transition-all transform group-hover:scale-105">ARR.</div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes smoke-1 {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    20% { opacity: 0.5; }
                    100% { transform: translateY(-70px) scale(2.5); opacity: 0; }
                }
                @keyframes smoke-2 {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    20% { opacity: 0.4; }
                    100% { transform: translateY(-90px) scale(3.5); opacity: 0; }
                }
                @keyframes smoke-3 {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    20% { opacity: 0.45; }
                    100% { transform: translateY(-80px) scale(3); opacity: 0; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.9); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-smoke-1 { animation: smoke-1 2.5s infinite ease-out; }
                .animate-smoke-2 { animation: smoke-2 2.5s infinite ease-out 0.8s; }
                .animate-smoke-3 { animation: smoke-3 2.5s infinite ease-out 1.6s; }
                .animate-blink { animation: blink 1s ease-in-out infinite; }
                .animate-spin-slow { animation: spin 0.8s linear infinite; }
                .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default TrainAnimation;
