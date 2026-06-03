import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    fullPage?: boolean;
    label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    fullPage = false,
    label
}) => {
    const dimensions = {
        small: 'w-10 h-10',
        medium: 'w-24 h-24',
        large: 'w-40 h-40',
    };

    const logoSize = {
        small: 'text-2xl w-6 h-6',
        medium: 'text-5xl w-14 h-14',
        large: 'text-7xl w-24 h-24',
    };

    const containerStyle = fullPage
        ? "fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm"
        : "flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px]";

    return (
        <div className={containerStyle}>
            <div className="relative flex items-center justify-center">
                {/* The Circling Ring */}
                <div className={`absolute ${dimensions[size]}`}>
                    <svg className="w-full h-full animate-spin-brand" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="spinner-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#60a5fa" />
                            </linearGradient>
                        </defs>
                        <circle
                            cx="50"
                            cy="50"
                            r="48"
                            fill="none"
                            stroke="url(#spinner-grad-main)"
                            strokeWidth="2"
                            strokeDasharray="80 200"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>

                {/* Static Outer Ring */}
                <div className={`${dimensions[size]} border-[0.5px] border-blue-50/50 rounded-full`} />

                {/* Central Brand Mark */}
                <div className={`absolute ${logoSize[size]} flex items-center justify-center rounded-xl bg-white shadow-md border border-gray-50 z-10`}>
                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-700 font-black select-none tracking-tighter">H</span>
                </div>
            </div>

            {label && (
                <p className="mt-4 text-sm font-semibold text-gray-400 uppercase tracking-widest animate-pulse">
                    {label}
                </p>
            )}
        </div>
    );
};

export default LoadingSpinner;
