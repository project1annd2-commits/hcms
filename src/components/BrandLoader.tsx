import React, { useEffect, useState } from 'react';

const BrandLoader: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Start fade out slightly before the 2s unmount to ensure smoothness
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 1600);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative flex flex-col items-center">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-blue-50 blur-3xl opacity-50 rounded-full animate-pulse" />

                <div className="relative flex items-center justify-center">
                    {/* The Circling Ring (Hostinger Style) */}
                    <div className="absolute w-[140px] h-[140px]">
                        <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#2563eb" />
                                    <stop offset="50%" stopColor="#4f46e5" />
                                    <stop offset="100%" stopColor="#7c3aed" />
                                </linearGradient>
                            </defs>
                            <circle
                                cx="50"
                                cy="50"
                                r="46"
                                fill="none"
                                stroke="url(#spinner-grad)"
                                strokeWidth="3"
                                strokeDasharray="60 180"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>

                    {/* Static Outer Ring */}
                    <div className="w-[140px] h-[140px] border-[1px] border-blue-50 rounded-full" />

                    {/* Central Brand Mark */}
                    <div className="absolute w-20 h-20 flex items-center justify-center rounded-2xl bg-white shadow-lg border border-gray-100 z-10 transition-all duration-500">
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-700 text-5xl font-black select-none tracking-tighter">H</span>
                    </div>
                </div>

                {/* Typography Overlay */}
                <div className="mt-12 flex flex-col items-center gap-1 animate-fade-in">
                    <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-900 tracking-tight">
                        HCMS
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="h-[2px] w-4 bg-blue-100 rounded-full" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">
                            Central Management
                        </span>
                        <div className="h-[2px] w-4 bg-blue-100 rounded-full" />
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin-slow {
          animation: spin-slow 1.5s linear infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
        </div>
    );
};

export default BrandLoader;
