import React, { useEffect, useRef } from 'react';
import { DocumentIcon } from './icons/DocumentIcon';
import { GmailIcon } from './icons/GmailIcon';
import { ShareIcon } from './icons/ShareIcon';

interface ShareExportPanelProps {
    onClose: () => void;
}

export const ShareExportPanel: React.FC<ShareExportPanelProps> = ({ onClose }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const handleShareConversation = async () => {
        const currentUrl = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Gemini Conversation',
                    text: 'Check out this conversation',
                    url: currentUrl
                });
            } catch {
                // Share was cancelled or failed
            }
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(currentUrl);
        }
        onClose();
    };

    const handleExportToDocs = () => {
        // Get the conversation text
        const conversationText = document.querySelector('.prose')?.textContent || '';

        // Create a Google Docs URL with the text
        const docsUrl = `https://docs.google.com/document/create?title=Gemini%20Conversation&body=${encodeURIComponent(conversationText)}`;

        // Open in new tab
        window.open(docsUrl, '_blank');
        onClose();
    };

    const handleDraftInGmail = () => {
        // Get the conversation text
        const conversationText = document.querySelector('.prose')?.textContent || '';

        // Create Gmail compose URL
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=Gemini%20Conversation&body=${encodeURIComponent(conversationText)}`;

        // Open in new tab
        window.open(gmailUrl, '_blank');
        onClose();
    };

    return (
        <div
            ref={panelRef}
            className="absolute bottom-full left-0 mb-2 w-52 bg-gray-800 dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden animate-fade-in z-50"
        >
            <div className="py-2">
                {/* Share conversation */}
                <button
                    onClick={handleShareConversation}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-gray-700 transition-colors text-left"
                >
                    <ShareIcon className="w-5 h-5" />
                    <span className="text-sm">Share conversation</span>
                </button>

                {/* Separator */}
                <div className="border-t border-gray-700 my-2"></div>

                {/* Export to Docs */}
                <button
                    onClick={handleExportToDocs}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-gray-700 transition-colors text-left"
                >
                    <DocumentIcon className="w-5 h-5" />
                    <span className="text-sm">Export to Docs</span>
                </button>

                {/* Draft in Gmail */}
                <button
                    onClick={handleDraftInGmail}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-gray-700 transition-colors text-left"
                >
                    <GmailIcon className="w-5 h-5" />
                    <span className="text-sm">Draft in Gmail</span>
                </button>
            </div>
        </div>
    );
};
