import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function Notification({
  isOpen,
  type,
  title,
  message,
  onClose,
  autoClose = true,
  duration = 4000
}: Props) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, duration, onClose]);

  if (!isOpen) return null;

  const config = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600',
      Icon: CheckCircle2
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-600',
      Icon: AlertCircle
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      Icon: AlertCircle
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-600',
      Icon: Info
    }
  };

  const style = config[type];
  const IconComponent = style.Icon;

  return (
    <div className="fixed top-4 right-4 z-[60] animate-slide-in">
      <div className={`${style.bg} ${style.border} border rounded-lg shadow-lg max-w-md min-w-80`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <IconComponent className={`${style.icon} flex-shrink-0 mt-0.5`} size={20} />
            <div className="flex-1">
              <h3 className={`font-semibold ${style.text}`}>{title}</h3>
              {message && (
                <p className={`text-sm ${style.text} mt-1 opacity-90`}>{message}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className={`${style.text} hover:opacity-75 transition-opacity flex-shrink-0`}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
