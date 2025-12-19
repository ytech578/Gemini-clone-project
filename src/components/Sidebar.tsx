import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Conversation } from '../types';
import { EditIcon } from './icons/EditIcon';
import { MenuIcon } from './icons/MenuIcon';
import { SettingsIcon } from './icons/SettingsIcon';

interface SidebarProps {
  isSidebarOpen: boolean;
  onNewChat: () => void;
  toggleSidebar: () => void;
  onToggleSettings: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export interface SidebarRef {
  settingsButton: HTMLButtonElement | null;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(
  (
    {
      isSidebarOpen,
      onNewChat,
      toggleSidebar,
      onToggleSettings,
      conversations,
      activeConversationId,
      onSelectConversation,
    },
    ref
  ) => {
    const settingsButtonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      settingsButton: settingsButtonRef.current,
    }));

    return (
      <>
        {/* Mobile overlay backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}

        <aside
          className={`bg-gemini-gray-100 dark:bg-gemini-dark-card flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-visible fixed md:relative z-50 md:z-auto h-full ${isSidebarOpen
            ? 'left-0 w-72'
            : '-left-72 md:left-0 w-72 md:w-20'
            }`}
        >
          <div className="pt-5 pb-4 px-4 flex-shrink-0">
            <div className="relative group">
              <button
                onClick={toggleSidebar}
                className="p-2 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 rounded-full"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
              {/* Tooltip */}
              <span className={`absolute px-2 py-1 text-xs text-white dark:text-black bg-gemini-gray-800 dark:bg-gemini-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 ${isSidebarOpen
                ? 'top-full -right1/2 -translate-x-1/2 ml-2 mt-2'
                : 'top-full left-full -translate-x-1/2 mt-2'
                }`}>
                {isSidebarOpen ? 'Collapse menu' : 'Expand menu'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 ml-1 mb-2 px-3 flex-shrink-0">
            <div className="relative group">
              <button
                onClick={onNewChat}
                className={`flex gap-3 px-2.5 py-2.5 text-gray-700 dark:text-gray-300 transition-all duration-200 ${isSidebarOpen
                  ? 'w-full rounded-full hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 justify-start px-1 py-2.5'
                  : 'p-2 rounded-full hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800'
                  }`}
              >
                <EditIcon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">New chat</span>}
              </button>
              {/* Tooltip */}
              {!isSidebarOpen && (
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 ml-2 px-2 py-1 text-sm text-white dark:text-black bg-gemini-gray-800 dark:bg-gemini-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  New chat
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-3">
            {isSidebarOpen && conversations.length > 0 && (
              <>
                <h3 className="py-2 pr-2 pl-3 text-sm font-bold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Chats
                </h3>
                <div className="space-y-0.5">
                  {conversations.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => onSelectConversation(convo.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${convo.id === activeConversationId
                        ? 'bg-[#d3e3fd] dark:bg-[#1f3760] text-[#0842A0] dark:text-[#d3e3fd]'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800'
                        }`}
                    >
                      <span className="line-clamp-1">{convo.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="py-2 flex-shrink-0 items-center px-4 mb-5 mt-2">
            <div className="relative group">
              <button
                ref={settingsButtonRef}
                onClick={onToggleSettings}
                className={`flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-all duration-200 ${isSidebarOpen
                  ? 'w-full rounded-full hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800 justify-start px-2 py-2.5'
                  : 'p-2 rounded-full hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-800'
                  }`}
              >
                <SettingsIcon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Settings and help</span>}
              </button>
              {/* Tooltip */}
              {!isSidebarOpen && (
                <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2  px-2 py-1 text-xs text-white dark:text-black bg-gemini-gray-800 dark:bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Settings
                </span>
              )}
            </div>
          </div>
        </aside>
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';
