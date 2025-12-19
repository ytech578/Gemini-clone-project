import React from 'react';
import { MenuIcon } from './icons/MenuIcon';
import { UserProfileMenu } from './UserProfileMenu';

interface HeaderProps {
    onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
    return (
        <header className="shrink-0 flex h-12 items-center justify-between ml-2 mr-3 mt-3 mb-2.5 py-1.5">
            <div className="flex items-center gap-2 px-2 py-1.5">
                {/* Mobile hamburger menu - only visible on mobile */}
                {onToggleSidebar && (
                    <button
                        onClick={onToggleSidebar}
                        className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 rounded-full transition-colors"
                    >
                        <MenuIcon className="w-5 h-5" />
                    </button>
                )}
                <a href='/' className="text-xl font-medium text-[#444746] dark:text-[#c4c7c5]">Gemini</a>
            </div>
            <div className="flex items-center gap-4 px-2 py-2">
                <UserProfileMenu />
            </div>
        </header>
    );
}