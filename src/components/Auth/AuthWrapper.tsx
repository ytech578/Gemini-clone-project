import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Login } from './Login';
import { Signup } from './Signup';

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();
    const [showLogin, setShowLogin] = useState(true);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return showLogin ? (
            <Login onSwitchToSignup={() => setShowLogin(false)} />
        ) : (
            <Signup onSwitchToLogin={() => setShowLogin(true)} />
        );
    }

    return <>{children}</>;
};
