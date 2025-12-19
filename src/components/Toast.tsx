import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'info' | 'error';
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 2000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColor = {
        success: 'bg-green-500',
        info: 'bg-blue-500',
        error: 'bg-red-500'
    }[type];

    return (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 animate-fade-in z-50">
            <div className={`${bgColor} text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium whitespace-nowrap`}>
                {message}
            </div>
        </div>
    );
};
