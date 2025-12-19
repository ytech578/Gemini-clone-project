import React, { useEffect, useRef, useState } from 'react';
import { Part } from '../types';
import { ExpandIcon } from './icons/ExpandIcon';
import { MicIcon } from './icons/MicIcon';
import { PlusIcon } from './icons/PlusIcon';
import { SendIcon } from './icons/SendIcon';
import { StopIcon } from './icons/StopIcon';
import { ToolsIcon } from './icons/ToolsIcon';

interface ChatInputProps {
  onSendMessage: (text: string, parts?: Part[]) => void;
  isLoading: boolean;
  isWelcomeScreen?: boolean;
  value: string;
  onChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

// Define SpeechRecognition interfaces locally to avoid global conflicts
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => unknown) | null;
  onerror: ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => unknown) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => unknown) | null;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionResultList {
  length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): ISpeechRecognitionAlternative;
  [index: number]: ISpeechRecognitionAlternative;
}

interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27B' },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  isWelcomeScreen,
  value,
  onChange,
  selectedModel,
  onModelChange,
  onExpandedChange
}) => {
  const [isListening, setIsListening] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [lineCount, setLineCount] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Simple height calculation
  useEffect(() => {
    if (textareaRef.current) {
      if (isExpanded) {
        // Expanded mode: fixed height
        textareaRef.current.style.height = '480px';
      } else if (!value || value.trim() === '') {
        // Empty: minimum height
        textareaRef.current.style.height = '40px';
      } else {
        // Normal mode: grow naturally up to max
        textareaRef.current.style.height = '40px';
        const scrollHeight = textareaRef.current.scrollHeight;
        const newHeight = Math.min(scrollHeight, 180);
        textareaRef.current.style.height = `${newHeight}px`;
      }
      // Calculate line count for showing fullscreen button
      const lines = Math.ceil(textareaRef.current.scrollHeight / 24);
      setLineCount(lines);
    }
  }, [value, isExpanded]);

  // Notify parent when expanded state changes
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = (event: ISpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognitionRef.current.onresult = (event: ISpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onChange(value + (value ? ' ' : '') + transcript);
      };
    }
  }, [value, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...files]);

      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async () => {
    if ((!value.trim() && selectedImages.length === 0) || isLoading) return;

    const imageParts: Part[] = [];
    for (const file of selectedImages) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      imageParts.push({
        inlineData: {
          data: base64,
          mimeType: file.type
        }
      });
    }

    onSendMessage(value, imageParts.length > 0 ? imageParts : undefined);
    onChange('');
    setSelectedImages([]);
    setImagePreviews([]);
  };

  const selectedModelName = GEMINI_MODELS.find(m => m.id === selectedModel)?.name || 'gemma-3-27b-it';

  const showFullscreenButton = lineCount > 2;

  return (
    <div className="w-full max-w-[760px] mx-auto relative">
      <div className={`min-h-[100px] md:min-h-[116px] ${isExpanded ? 'max-h-[560px]' : 'max-h-[260px]'} w-full rounded-[1.5rem] md:rounded-[2rem] p-2 md:p-3 transition-all duration-300 ease-out bg-gray-50 dark:bg-gemini-gray-900 border border-gray-300 dark:border-gray-700 flex flex-col ${isListening ? 'ring-2 ring-blue-500' : ''}`}>

        {/* Image Previews */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-1 py-1">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative flex-shrink-0 group">
                <img src={preview} alt="Preview" className="h-[80px] w-[80px] object-cover rounded-lg cursor-pointer" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-3 -right-1 translate-y-1/2 bg-gray-700 dark:bg-gray-600 text-white rounded-full p-1 opacity-100 hover:bg-red-500 dark:hover:bg-red-500 transition-colors z-10"
                >
                  <span className="sr-only">Remove</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            id="chat-input"
            name="chat-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Gemini"
            className="w-full bg-transparent text-gemini-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none outline-none border-none py-2 px-3 text-base font-sans no-scrollbar overflow-y-auto transition-[height] duration-300 ease-out"
          />
          {/* Fullscreen button - appears when >2 lines or expanded */}
          {(showFullscreenButton || isExpanded) && (
            <div className="absolute top-0 right-0 group">
              <button
                className="p-3 text-[#444746] dark:text-[#c4c7c5] hover:bg-gray-200 dark:hover:bg-gemini-gray-800 rounded-full transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
              {/* Tooltip */}
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs text-white dark:text-black bg-black dark:bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {isExpanded ? 'Collapse' : 'Fullscreen'}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                className="p-2 text-[#444746] dark:text-[#c4c7c5] hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 rounded-full transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusIcon className="w-5 h-5" />
              </button>
              {/* Tooltip */}
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs text-white dark:text-black bg-black dark:bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Add files
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 rounded-full text-sm text-[#444746] dark:text-[#c4c7c5] transition-colors"
            >
              <ToolsIcon className="w-5 h-5" />
              <span>Tools</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {value.trim() || selectedImages.length > 0 ? (
              <div className="relative group">
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="p-3 bg-gray-100 dark:bg-gemini-gray-900 text-[#1f1f1f] dark:text-white hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 opacity-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendIcon className="w-5 h-5" />
                </button>
                {/* Tooltip */}
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white dark:text-black bg-gemini-gray-800 dark:bg-gemini-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Submit
                </span>
              </div>
            ) : (
              <>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 rounded-full text-sm text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    <span>{selectedModelName}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {showModelDropdown && (
                    <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gemini-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[200px] z-50">
                      {GEMINI_MODELS.map(model => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onModelChange(model.id);
                            setShowModelDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gemini-gray-100 dark:hover:bg-gemini-gray-800 transition-colors ${model.id === selectedModel ? 'bg-gemini-gray-100 dark:bg-gemini-gray-800 font-medium' : ''
                            } first:rounded-t-lg last:rounded-b-lg text-gray-700 dark:text-gray-300`}
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative group">
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-700'}`}
                  >
                    {isListening ? <StopIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                  </button>
                  {/* Tooltip */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs text-white dark:text-black bg-black dark:bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {isListening ? 'Stop listening' : 'Use microphone'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {
        !isWelcomeScreen && (
          <p className="text-center text-xs font-sans text-[#444746] dark:text-[#c4c7c5] my-4">
            Gemini can make mistakes, so double-check it
          </p>
        )
      }
    </div>
  );
};
