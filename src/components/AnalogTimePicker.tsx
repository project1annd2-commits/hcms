import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Props {
    value: string; // HH:MM format
    onChange: (time: string) => void;
    label: string;
}

export default function AnalogTimePicker({ value, onChange, label }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [hour, setHour] = useState(0);
    const [minute, setMinute] = useState(0);
    const [isDragging, setIsDragging] = useState<'hour' | 'minute' | null>(null);
    const clockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':').map(Number);
            setHour(h);
            setMinute(m);
        }
    }, [value]);

    const getAngle = (clientX: number, clientY: number) => {
        if (!clockRef.current) return 0;

        const rect = clockRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;

        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        angle = (angle + 90 + 360) % 360;

        return angle;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        const angle = getAngle(e.clientX, e.clientY);

        if (isDragging === 'hour') {
            const newHour = Math.round((angle / 360) * 12) % 12;
            const displayHour = hour >= 12 ? newHour + 12 : newHour;
            setHour(displayHour);
        } else if (isDragging === 'minute') {
            const newMinute = Math.round((angle / 360) * 60) % 60;
            setMinute(newMinute);
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            onChange(timeString);
        }
        setIsDragging(null);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, hour, minute]);

    const hourAngle = ((hour % 12) / 12) * 360;
    const minuteAngle = (minute / 60) * 360;

    const formatTime = (h: number, m: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 || 12;
        return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
    };

    const toggleAMPM = () => {
        setHour((prev) => {
            const newHour = prev < 12 ? prev + 12 : prev - 12;
            const timeString = `${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            onChange(timeString);
            return newHour;
        });
    };

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-gray-50 flex items-center justify-between"
            >
                <span className="flex items-center gap-2">
                    <Clock size={18} className="text-gray-500" />
                    <span className="font-medium">{formatTime(hour, minute)}</span>
                </span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute z-50 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-80">
                        <div className="text-center mb-4">
                            <div className="text-3xl font-bold text-gray-900">
                                {formatTime(hour, minute)}
                            </div>
                        </div>

                        {/* Analog Clock */}
                        <div className="relative mx-auto" style={{ width: '240px', height: '240px' }}>
                            <div
                                ref={clockRef}
                                className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 border-4 border-blue-200 shadow-inner"
                            >
                                {/* Hour markers */}
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const angle = (i / 12) * 360;
                                    const radian = (angle - 90) * (Math.PI / 180);
                                    const x = 50 + 40 * Math.cos(radian);
                                    const y = 50 + 40 * Math.sin(radian);

                                    return (
                                        <div
                                            key={i}
                                            className="absolute text-sm font-bold text-gray-700"
                                            style={{
                                                left: `${x}%`,
                                                top: `${y}%`,
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                        >
                                            {i === 0 ? 12 : i}
                                        </div>
                                    );
                                })}

                                {/* Minute markers */}
                                {Array.from({ length: 60 }).map((_, i) => {
                                    if (i % 5 === 0) return null;
                                    const angle = (i / 60) * 360;
                                    const radian = (angle - 90) * (Math.PI / 180);
                                    const x = 50 + 45 * Math.cos(radian);
                                    const y = 50 + 45 * Math.sin(radian);

                                    return (
                                        <div
                                            key={i}
                                            className="absolute w-1 h-1 bg-gray-400 rounded-full"
                                            style={{
                                                left: `${x}%`,
                                                top: `${y}%`,
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                        />
                                    );
                                })}

                                {/* Center dot */}
                                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20" />

                                {/* Hour hand */}
                                <div
                                    className="absolute top-1/2 left-1/2 origin-bottom cursor-grab active:cursor-grabbing"
                                    style={{
                                        width: '6px',
                                        height: '60px',
                                        marginLeft: '-3px',
                                        transform: `translateY(-100%) rotate(${hourAngle}deg)`,
                                        transition: isDragging === 'hour' ? 'none' : 'transform 0.3s ease',
                                    }}
                                    onMouseDown={() => setIsDragging('hour')}
                                >
                                    <div className="w-full h-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-full shadow-lg" />
                                </div>

                                {/* Minute hand */}
                                <div
                                    className="absolute top-1/2 left-1/2 origin-bottom cursor-grab active:cursor-grabbing"
                                    style={{
                                        width: '4px',
                                        height: '80px',
                                        marginLeft: '-2px',
                                        transform: `translateY(-100%) rotate(${minuteAngle}deg)`,
                                        transition: isDragging === 'minute' ? 'none' : 'transform 0.3s ease',
                                    }}
                                    onMouseDown={() => setIsDragging('minute')}
                                >
                                    <div className="w-full h-full bg-gradient-to-t from-indigo-600 to-indigo-500 rounded-full shadow-lg" />
                                </div>
                            </div>
                        </div>

                        {/* AM/PM Toggle & Manual Input */}
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleAMPM}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${hour < 12
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleAMPM}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${hour >= 12
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    PM
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={hour % 12 || 12}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        const newHour = hour >= 12 ? (val % 12) + 12 : val % 12;
                                        setHour(newHour);
                                    }}
                                    onBlur={() => {
                                        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                                        onChange(timeString);
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold"
                                />
                                <span className="flex items-center text-2xl font-bold text-gray-400">:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={minute}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setMinute(Math.min(59, Math.max(0, val)));
                                    }}
                                    onBlur={() => {
                                        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                                        onChange(timeString);
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
