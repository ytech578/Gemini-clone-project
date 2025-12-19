import React, { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { ChatMessage } from './ChatMessage';
// FIX: Import missing components
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SparkleIcon } from './icons/SparkleIcon';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onViewImage: (imageUrl: string) => void;
  onEditMessage?: (messageIndex: number, newText: string) => void;
  conversationId?: string | null;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading, onViewImage, onEditMessage, conversationId }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const prevConversationIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (scrollRef.current) {
      // If conversation changed (switched to different conversation), scroll to top smoothly
      if (conversationId !== prevConversationIdRef.current && conversationId !== undefined) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        prevConversationIdRef.current = conversationId;
        prevMessageCountRef.current = messages.length;
        return;
      }

      // Only scroll to bottom when NEW messages are added (count increases)
      if (messages.length > prevMessageCountRef.current || isLoading) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }

      prevMessageCountRef.current = messages.length;
    }
  }, [messages, isLoading, conversationId]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar overflow-x-hidden">
      <div className="py-4">
        {messages.map((msg, index) => {
          // Find the last model message index (only model messages, not loading)
          const lastModelIndex = [...messages].reverse().findIndex(m => m.role === 'model' && m.parts.some(p => 'text' in p && p.text));
          const actualLastModelIndex = lastModelIndex >= 0 ? messages.length - 1 - lastModelIndex : -1;
          const isLastModel = index === actualLastModelIndex && !isLoading;

          // Find the last user message index
          const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
          const actualLastUserIndex = lastUserIndex >= 0 ? messages.length - 1 - lastUserIndex : -1;
          const isLastUser = index === actualLastUserIndex;

          return (
            <ChatMessage
              key={index}
              message={msg}
              isStreaming={isLoading && index === messages.length - 1}
              isLastModelMessage={isLastModel}
              isLastUserMessage={isLastUser}
              onViewImage={onViewImage}
              onEditMessage={isLastUser && onEditMessage ? (originalText, newText) => onEditMessage(index, newText) : undefined}
            />
          );
        })}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex w-full justify-start p-2 md:p-3">
            <div className="max-w-[90%] md:max-w-[80%] flex items-start gap-3">
              <div className="flex-shrink-0 pt-1">
                <SparkleIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 flex flex-col gap-2 text-gray-800 dark:text-gray-200 rounded-2xl">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                  <span>Show thinking</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl bg-gemini-gray-100 dark:bg-gemini-dark-card">
                  <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};