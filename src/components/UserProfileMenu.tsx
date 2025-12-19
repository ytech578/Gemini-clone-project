import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CameraIcon } from './icons/CameraIcon';
import { CloseIcon } from './icons/CloseIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserAddIcon } from './icons/UserAddIcon';

export const UserProfileMenu: React.FC = () => {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Load user's avatar from profile
    useEffect(() => {
        if (user) {
            loadAvatar();
        }
    }, [user]);

    const loadAvatar = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', user?.id)
                .maybeSingle();

            if (error) throw error;
            if (data?.avatar_url) {
                setAvatarUrl(data.avatar_url);
            }
        } catch (error) {
            console.error('Error loading avatar:', error);
        }
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user?.id}/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('user-uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data } = supabase.storage
                .from('user-uploads')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            // UPSERT profile (creates if doesn't exist, updates if it does)
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    email: user?.email,
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (upsertError) throw upsertError;

            // Add timestamp to force browser refresh
            const timestampedUrl = `${publicUrl}?t=${new Date().getTime()}`;
            setAvatarUrl(timestampedUrl);

            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            const errorMessage = error?.message || error?.error_description || JSON.stringify(error);
            alert(`Error uploading image: ${errorMessage}\n\nPlease check:\n1. Storage bucket "user-uploads" exists in Supabase\n2. Bucket is set to Public`);
        } finally {
            setUploading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        setIsOpen(false);
    };

    const getInitials = () => {
        if (!user?.email) return 'U';
        return user.email.charAt(0).toUpperCase();
    };

    const getUserName = () => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    };

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            {/* User Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2"
            >
                <div className="w-8 h-8 rounded-full bg-gray-700 dark:bg-gray-800 flex items-center justify-center text-white font-semibold text-sm overflow-hidden ">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        getInitials()
                    )}
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute pt-2 pb-2 px-3 right-4 top-full mt-2 w-96 dark:bg-[#28292a] bg-[#e9eef6] rounded-3xl shadow-2xl overflow-hidden animate-fade-in z-50">
                    {/* Header */}
                    <div className=" border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm ml-12 pl-6 gap-3 text-[#444746] dark:text-[#c4c7c5]">{user.email}</span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-[#e0e4e9] dark:hover:bg-[#3c4043] rounded-full transition-colors"
                        >
                            <CloseIcon className="size-6 text-gray-600 dark:text-[#e3e3e3] " />
                        </button>
                    </div>

                    {/* Profile Section */}
                    <div className="py-2 flex flex-col items-center">
                        {/* Avatar with upload */}
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full bg-gray-700 dark:bg-gray-800 flex items-center justify-center text-white font-bold text-2xl overflow-hidden border-4 border-white dark:border-gray-800">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    getInitials()
                                )}
                            </div>

                            {/* Camera overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                                <CameraIcon className="w-4 h-4 text-white" />
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        <h3 className="my-2 text-xl font-medium text-gray-700 dark:text-white">
                            Hi, {getUserName()}!
                        </h3>

                        <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-blue-500 dark:text-blue-400 hover:bg-[#e0e4e9] dark:hover:bg-[#3c4043] transition-colors">
                            Manage your Google Account
                        </button>
                    </div>

                    {/* Actions - Add account and Sign out side by side */}
                    <div className="px-4 py-2 flex items-center gap-1">
                        {/* Add Account */}
                        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-l-full bg-[#fcfcfc] dark:bg-[#28292a] hover:bg-[#e0e4e9] dark:hover:bg-[#3c4043] transition-colors border border-gray-200 dark:border-gray-600">
                            <UserAddIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 " />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add account</span>
                        </button>

                        {/* Sign Out */}
                        <button
                            onClick={handleSignOut}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-r-full bg-[#fcfcfc] dark:bg-[#28292a] hover:bg-[#e0e4e9] dark:hover:bg-[#3c4043] transition-colors border border-gray-200 dark:border-gray-600"
                        >
                            <LogoutIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sign out</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="px-2 py-3 border-gray-200 dark:border-gray-700 flex items-center justify-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <a href="#" className="hover:underline  rounded-md border-gray-200 dark:hover:bg-[#3c4043]">Privacy policy</a>
                        <span className="text-gray-500 dark:text-gray-400 justify-center items-center">•</span>
                        <a href="#" className="hover:underline">Terms of Service</a>
                    </div>
                </div>
            )}
        </div>
    );
};
