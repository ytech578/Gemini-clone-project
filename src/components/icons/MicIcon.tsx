import React from 'react';

export const MicIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 14.5a3 3 0 003-3v-5a3 3 0 10-6 0v5a3 3 0 003 3z" />
      <path d="M5 11.5a1 1 0 00-2 0 9 9 0 0018 0 1 1 0 10-2 0 7 7 0 11-14 0z" />
      <path d="M11 18.9V22h2v-3.1a8.5 8.5 0 01-2 0z" />
    </svg>
);