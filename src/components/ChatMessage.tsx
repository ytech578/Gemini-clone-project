import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { CheckmarkIcon } from './icons/CheckmarkIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { CopyIcon } from './icons/CopyIcon';
import { EditIcon } from './icons/EditIcon';
import { ErrorIcon } from './icons/ErrorIcon';
import { LoadingSpinner } from './icons/LoadingSpinner';
import { MoreIcon } from './icons/MoreIcon';
import { RedoIcon } from './icons/RedoIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ShareIcon } from './icons/ShareIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { ThumbsDownIcon } from './icons/ThumbsDownIcon';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { VolumeIcon } from './icons/VolumeIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ShareExportPanel } from './ShareExportPanel';
import { Toast } from './Toast';
import { TypingEffect } from './TypingEffect';

interface ChatMessageProps {
    message: ChatMessageType;
    isStreaming?: boolean;
    isLastModelMessage?: boolean;
    isLastUserMessage?: boolean;
    onViewImage: (imageUrl: string) => void;
    onEditMessage?: (originalText: string, newText: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    isStreaming = false,
    isLastModelMessage = false,
    isLastUserMessage = false,
    onViewImage,
    onEditMessage
}) => {
    const { role, parts, sources } = message;

    const isModel = role === 'model';
    const isError = role === 'error';
    const isUser = role === 'user';

    const textParts = parts.filter(p => 'text' in p && p.text);
    const imageParts = parts.filter(p => p.inlineData && p.inlineData.mimeType?.startsWith('image/'));

    const hasContent = textParts.length > 0 || imageParts.length > 0;

    const containerClasses = isUser ? "justify-end" : "justify-start";
    const innerFlexClasses = isUser ? "flex-row-reverse" : "flex-row";
    const bubbleClasses = isUser
        ? "bg-gray-200 dark:bg-gray-700 p-3 rounded-2xl"
        : "bg-transparent";

    const [thumbsUp, setThumbsUp] = useState(false);
    const [thumbsDown, setThumbsDown] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showCopyCheck, setShowCopyCheck] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [animatingButton, setAnimatingButton] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isUserMessageHovered, setIsUserMessageHovered] = useState(false);
    const [showUserCopyCheck, setShowUserCopyCheck] = useState(false);
    const [showVoiceMenu, setShowVoiceMenu] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
        return localStorage.getItem('preferredVoice') || '';
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const originalText = textParts.map(part => 'text' in part ? part.text : '').join('\n');
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Expand/collapse state for long user messages
    const [isTextExpanded, setIsTextExpanded] = useState(false);
    const MAX_LINES = 5;

    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Close more menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // Get all text content
    const getTextContent = () => {
        return textParts.map(part => 'text' in part ? part.text : '').join('\n');
    };

    // Handle thumbs up
    const handleThumbsUp = () => {
        setThumbsUp(!thumbsUp);
        if (thumbsDown) setThumbsDown(false);
        setAnimatingButton('thumbsUp');
        setTimeout(() => setAnimatingButton(null), 250);
        setToastMessage('Feedback recorded');
    };

    // Handle thumbs down
    const handleThumbsDown = () => {
        setThumbsDown(!thumbsDown);
        if (thumbsUp) setThumbsUp(false);
        setAnimatingButton('thumbsDown');
        setTimeout(() => setAnimatingButton(null), 250);
        setToastMessage('Feedback recorded');
    };

    // Handle regenerate
    const handleRegenerate = () => {
        if (isRegenerating) return;

        setIsRegenerating(true);
        setAnimatingButton('redo');

        // Simulate regeneration (replace with actual regeneration logic)
        setTimeout(() => {
            setIsRegenerating(false);
            setAnimatingButton(null);
        }, 2000);
    };

    // Handle copy
    const handleCopy = () => {
        const text = getTextContent();
        navigator.clipboard.writeText(text).then(() => {
            setShowCopyCheck(true);
            setAnimatingButton('copy');
            setToastMessage('Copied to clipboard');

            setTimeout(() => {
                setShowCopyCheck(false);
                setAnimatingButton(null);
            }, 1000);
        });
    };

    // Handle share panel toggle
    const handleShareToggle = () => {
        setShowSharePanel(!showSharePanel);
        setAnimatingButton('share');
        setTimeout(() => setAnimatingButton(null), 250);
    };

    // Handle listen (text-to-speech)
    const handleListen = (voiceName?: string) => {
        let text = getTextContent();

        // Clean markdown symbols so they don't get read out loud
        text = text
            .replace(/\*\*/g, '')      // Remove bold **
            .replace(/\*/g, '')        // Remove italic *
            .replace(/#{1,6}\s?/g, '') // Remove headings #
            .replace(/`{1,3}/g, '')    // Remove code blocks `
            .replace(/^\s*[-*+]\s/gm, '') // Remove list bullets
            .replace(/[^\x00-\x7F]/g, '') //Remove emojis
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
            .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
            .trim();

        if (isListening) {
            window.speechSynthesis.cancel();
            setIsListening(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(text);

            // Use selected voice if available
            const voiceToUse = voiceName || selectedVoiceName;
            if (voiceToUse) {
                const voice = availableVoices.find(v => v.name === voiceToUse);
                if (voice) utterance.voice = voice;
            }

            utterance.onend = () => setIsListening(false);
            window.speechSynthesis.speak(utterance);
            setIsListening(true);
        }
        setShowMoreMenu(false);
        setShowVoiceMenu(false);
    };

    // Handle voice selection
    const handleVoiceSelect = (voiceName: string) => {
        setSelectedVoiceName(voiceName);
        localStorage.setItem('preferredVoice', voiceName);
        handleListen(voiceName);
    };

    return (
        <div className={`flex min-h-[100px] max-h-full w-full ${containerClasses} p-2 md:p-3`}>
            <div className={`${isUser ? 'max-w-[75%]' : 'w-full'} flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}
                onMouseEnter={() => isUser && setIsUserMessageHovered(true)}
                onMouseLeave={() => isUser && setIsUserMessageHovered(false)}
            >
                {/* User message row with icons and bubble */}
                <div className={`flex items-start gap-2 ${innerFlexClasses}`}>
                    {!isUser && (
                        <div className="flex-shrink-0 pt-1">
                            <SparkleIcon className="w-6 h-6" />
                        </div>
                    )}

                    {/* User bubble with edit mode */}
                    {isUser ? (
                        isEditing ? (
                            <div className="h-[200px] min-w-[750px] max-w-[900px] ring-2 ring-blue-300 bg-gray-100 dark:bg-gray-800 rounded-3xl p-3">
                                <textarea
                                    ref={editTextareaRef}
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full h-full bg-transparent outline-none resize-none text-gray-800 dark:text-gray-200 scrollbar-hide overflow-y-auto"
                                    rows={Math.max(1, editText.split('\n').length)}
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className="relative overflow-visible">
                                <div className={`bg-gray-200 dark:bg-[#1e1f20] p-4 rounded-l-3xl rounded-br-3xl rounded-tr-none ${(originalText.split('\n').length > MAX_LINES || originalText.length > 400) ? 'pr-10' : ''}`}>
                                    {/* User uploaded images */}
                                    {imageParts.length > 0 && (
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            {imageParts.map((part, index) => {
                                                if ('inlineData' in part && part.inlineData) {
                                                    const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                                                    return (
                                                        <button
                                                            key={`user-img-${index}`}
                                                            onClick={() => onViewImage(imageUrl)}
                                                            className="overflow-hidden rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <img
                                                                src={imageUrl}
                                                                alt="Uploaded"
                                                                className="min-h-[140px] max-h-[250px] max-w-[340px] object-contain rounded-2xl"
                                                            />
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                    {!isTextExpanded ? (
                                        <p className="line-clamp-5 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                                            {originalText}
                                        </p>
                                    ) : (
                                        <div>
                                            {textParts.map((part, index) => {
                                                if ('text' in part && part.text) {
                                                    return <MarkdownRenderer key={`text-${index}`} content={part.text} />;
                                                }
                                                return null;
                                            })}
                                        </div>
                                    )}
                                </div>
                                {/* Expand/Collapse button - only show for long text */}
                                {originalText.split('\n').length > MAX_LINES || originalText.length > 400 ? (
                                    <div className="absolute top-3 right-3 group">
                                        <button
                                            onClick={() => setIsTextExpanded(!isTextExpanded)}
                                            className="p-2.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors bg-transparent "
                                        >
                                            {isTextExpanded ? (
                                                <ChevronUpIcon className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                                            ) : (
                                                <ChevronDownIcon className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                                            )}
                                        </button>
                                        <span className="absolute px-2 py-1 rounded-md top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gray-800 whitespace-nowrap bg-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
                                            {isTextExpanded ? 'Collapse text' : 'Expand text'}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        )
                    ) : (
                        <div className={`flex flex-col ${isModel ? 'gap-2' : ''} flex-1 text-gray-800 dark:text-gray-200 ${bubbleClasses}`}>
                            {isError ? (
                                <div className="text-red-500 bg-gemini-gray-100 dark:bg-gemini-dark-card p-3 rounded-2xl">
                                    <div className="flex items-center gap-2 font-bold">
                                        <ErrorIcon className="w-5 h-5" />
                                        <p>An error occurred</p>
                                    </div>
                                    {parts.map((part, index) => 'text' in part && <p key={index}>{part.text}</p>)}
                                </div>
                            ) : (
                                <>
                                    {isModel && hasContent && (
                                        <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium hover:bg-gemini-gray-100 dark:hover:bg-gemini-gray-800 px-3 py-2 rounded-full transition-colors w-fit">
                                            <span>Show thinking</span>
                                            <ChevronDownIcon className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div>
                                        {textParts.map((part, index) => {
                                            if ('text' in part && part.text) {
                                                const isLastTextPart = index === textParts.length - 1;
                                                if (isStreaming && isLastTextPart) {
                                                    return <TypingEffect key={`text-${index}`} text={part.text} />;
                                                }
                                                return <MarkdownRenderer key={`text-${index}`} content={part.text} />;
                                            }
                                            return null;
                                        })}

                                        {imageParts.length > 0 && (
                                            <div className="mt-2 grid grid-cols-2 rounded-lg md:grid-cols-3 gap-2">
                                                {imageParts.map((part, index) => {
                                                    if ('inlineData' in part && part.inlineData) {
                                                        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                                                        return (
                                                            <button
                                                                key={`img-${index}`}
                                                                onClick={() => onViewImage(imageUrl)}
                                                                className="overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gemini-dark focus:ring-blue-500"
                                                            >
                                                                <img
                                                                    src={imageUrl}
                                                                    alt="Content"
                                                                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                                                />
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        )}

                                        {sources && sources.length > 0 && !isStreaming && (
                                            <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-3">
                                                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                                                    <SearchIcon className="w-4 h-4" />
                                                    Sources
                                                </h4>
                                                <div className="flex flex-col gap-2">
                                                    {sources.map((source, index) => (
                                                        <a
                                                            key={index}
                                                            href={source.uri}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 group"
                                                        >
                                                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-gemini-gray-200 dark:bg-gemini-gray-700 rounded-full text-xs">
                                                                {index + 1}
                                                            </div>
                                                            <span className="truncate group-hover:text-clip">{source.title || new URL(source.uri).hostname}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    {isModel && hasContent && !isStreaming && (
                                        <div className="relative flex justify-start ">
                                            {toastMessage && (
                                                <Toast
                                                    message={toastMessage}
                                                    type="success"
                                                    onClose={() => setToastMessage(null)}
                                                />
                                            )}

                                            <div className="inline-flex items-center">
                                                <div className="relative group">
                                                    <button
                                                        onClick={handleThumbsUp}
                                                        disabled={isRegenerating}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 ${animatingButton === 'thumbsUp' ? 'animate-scale-up' : ''} ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <ThumbsUpIcon className={`w-4 h-4 transition-colors ${thumbsUp ? 'text-blue-500 fill-blue-500' : 'text-gray-600 dark:text-gray-400'}`} />
                                                    </button>
                                                    <span className="absolute px-2.5 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
                                                        Good response
                                                    </span>
                                                </div>

                                                <div className="relative group">
                                                    <button
                                                        onClick={handleThumbsDown}
                                                        disabled={isRegenerating}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 ${animatingButton === 'thumbsDown' ? 'animate-scale-up' : ''} ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <ThumbsDownIcon className={`w-4 h-4 transition-colors ${thumbsDown ? 'text-orange-500 fill-orange-500' : 'text-gray-600 dark:text-gray-400'}`} />
                                                    </button>
                                                    <span className="absolute px-2.5 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
                                                        Bad response
                                                    </span>
                                                </div>

                                                <div className="relative group">
                                                    <button
                                                        onClick={handleRegenerate}
                                                        disabled={isRegenerating}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 ${isRegenerating ? 'opacity-75 cursor-not-allowed' : ''}`}
                                                    >
                                                        {isRegenerating ? (
                                                            <LoadingSpinner className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                        ) : (
                                                            <RedoIcon className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${animatingButton === 'redo' ? 'animate-spin-once' : ''}`} />
                                                        )}
                                                    </button>
                                                    <span className="absolute px-2.5 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
                                                        {isRegenerating ? 'Regenerating...' : 'Redo'}
                                                    </span>
                                                </div>

                                                <div className="relative group">
                                                    <button
                                                        onClick={handleShareToggle}
                                                        disabled={isRegenerating}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 ${animatingButton === 'share' ? 'animate-scale-up' : ''} ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <ShareIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                    </button>
                                                    <span className="absolute px-2.5 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
                                                        Share and export
                                                    </span>

                                                    {showSharePanel && (
                                                        <ShareExportPanel onClose={() => setShowSharePanel(false)} />
                                                    )}
                                                </div>

                                                <div className="relative group">
                                                    <button
                                                        onClick={handleCopy}
                                                        disabled={isRegenerating}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 ${animatingButton === 'copy' ? 'animate-scale-up' : ''} ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {showCopyCheck ? (
                                                            <CheckmarkIcon className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <CopyIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                        )}
                                                    </button>
                                                    <span className="absolute px-2 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
                                                        Copy
                                                    </span>
                                                </div>

                                                <div className="relative group" ref={moreMenuRef}>
                                                    <button
                                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                                        disabled={isRegenerating}
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <MoreIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                    </button>
                                                    <span className="absolute px-2 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-50">
                                                        More
                                                    </span>

                                                    {showMoreMenu && (
                                                        <div className="absolute bottom-full left-0 mb-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                                                            {/* Listen with Voice Submenu */}
                                                            <div className="relative">
                                                                <button
                                                                    onMouseEnter={() => setShowVoiceMenu(!showVoiceMenu)}
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <VolumeIcon className="w-4 h-4" />
                                                                        <span>{isListening ? 'Stop' : 'Listen'}</span>
                                                                    </div>
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </button>

                                                                {showVoiceMenu && (
                                                                    <div className="absolute left-full top-0 ml-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50 max-h-64 overflow-y-scroll scrollbar-hide">
                                                                        {availableVoices.map(voice => (
                                                                            <button
                                                                                key={voice.name}
                                                                                onClick={() => handleVoiceSelect(voice.name)}
                                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors truncate ${selectedVoiceName === voice.name ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-400'}`}
                                                                            >
                                                                                {voice.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                                                            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                                <SparkleIcon className="w-3 h-3" />
                                                                <span>Model: 3 Pro</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                </>
                            )}
                        </div>
                    )}

                    {/* User message action icons - appear on hover, only for text-based prompts */}
                    {isUser && !isEditing && textParts.length > 0 && (
                        <div className={`flex items-center gap-1 transition-opacity duration-200 ${isUserMessageHovered ? 'opacity-100' : 'opacity-0'}`}>
                            {/* Copy Icon */}
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(originalText);
                                        setShowUserCopyCheck(true);
                                        setTimeout(() => setShowUserCopyCheck(false), 1500);
                                    }}
                                    className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {showUserCopyCheck ? (
                                        <CheckmarkIcon className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <CopyIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    )}
                                </button>
                                <span className="absolute px-2 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-10">
                                    Copy prompt
                                </span>
                            </div>
                            {/* Edit Icon - only for latest user message */}
                            {isLastUserMessage && (
                                <div className="relative group">
                                    <button
                                        onClick={() => {
                                            setEditText(originalText);
                                            setIsEditing(true);
                                            setTimeout(() => {
                                                if (editTextareaRef.current) {
                                                    editTextareaRef.current.focus();
                                                    editTextareaRef.current.setSelectionRange(
                                                        editTextareaRef.current.value.length,
                                                        editTextareaRef.current.value.length
                                                    );
                                                }
                                            }, 50);
                                        }}
                                        className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <EditIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </button>
                                    <span className="absolute px-2 py-1 rounded-md inline-block -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-sans text-white dark:text-gemini-gray-700 whitespace-nowrap bg-gemini-gray-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md z-10">
                                        Edit prompt
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Cancel / Update buttons for edit mode */}
                {isUser && isEditing && (
                    <div className="flex items-center gap-3 mt-2">
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setEditText('');
                            }}
                            className="px-4 py-1.5 text-semibold rounded-full text-blue-600 dark:text-blue-500 hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (editText !== originalText && onEditMessage) {
                                    onEditMessage(originalText, editText);
                                }
                                setIsEditing(false);
                                setEditText('');
                            }}
                            disabled={editText === originalText}
                            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${editText !== originalText
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Update
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};