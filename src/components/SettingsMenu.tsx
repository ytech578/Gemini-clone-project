import React, { useState } from 'react';
import { Theme } from '../hooks/useTheme';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ThemeIcon } from './icons/ThemeIcon';

interface SettingsMenuProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onClose: () => void;
}

const MenuItem: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  hasSubMenu?: boolean;
}> = ({ onClick, children, hasSubMenu }) => (
  <button
    onClick={onClick}
    className="w-full flex justify-between items-center text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-700 rounded-md"
  >
    {children}
    {hasSubMenu && <ChevronRightIcon className="w-4 h-4" />}
  </button>
);


const ThemeSubMenu: React.FC<{
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  onBack: () => void;
}> = ({ currentTheme, onSelectTheme, onBack }) => (
  <div>
    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 mb-1">
      <h3 className="font-semibold text-sm">Theme</h3>
    </div>
    {(['System', 'Light', 'Dark'] as const).map(themeOption => {
      const themeValue = themeOption.toLowerCase() as Theme;
      return (
        <button
          key={themeValue}
          onClick={() => onSelectTheme(themeValue)}
          className="w-full flex justify-between items-center text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-700 rounded-md"
        >
          <span>{themeOption}</span>
          {currentTheme === themeValue && <CheckIcon className="w-4 h-4 text-blue-500" />}
        </button>
      )
    })}
  </div>
);


export const SettingsMenu = React.forwardRef<HTMLDivElement, SettingsMenuProps>(({ theme, setTheme, onClose }, ref) => {
  const [view, setView] = useState<'main' | 'theme'>('main');

  const handleThemeSelect = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed bottom-4 left-24 z-50 w-64 bg-gemini-gray-100 dark:bg-gemini-dark-card rounded-lg shadow-2xl p-2 border border-gray-200 dark:border-gray-700"
    >
      {view === 'main' && (
        <div>
          <MenuItem onClick={() => setView('theme')} hasSubMenu>
            <div className="flex items-center gap-3">
              <ThemeIcon className="w-5 h-5" />
              <span>Theme</span>
            </div>
          </MenuItem>
          {/* Add other main menu items here */}
        </div>
      )}
      {view === 'theme' && (
        <ThemeSubMenu currentTheme={theme} onSelectTheme={handleThemeSelect} onBack={() => setView('main')} />
      )}
    </div>
  );
});