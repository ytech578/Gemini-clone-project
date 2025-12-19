import React from 'react';

interface SuggestionChipsProps {
  onPromptHintClick: (prompt: string) => void;
}

const suggestionChipsData = [
  { text: "Create Image", promptHint: "Create an image of ", icon: "🎨" },
  { text: "Write", promptHint: "Write a short story about " },
  { text: "Build", promptHint: "Build a website for " },
  { text: "Deep Research", promptHint: "Do a deep research on the topic of " },
  { text: "Create video", promptHint: "Create a video about " },
  { text: "Learn", promptHint: "I want to learn about " },
];

const SuggestionChip: React.FC<{ text: string; onClick: () => void; icon?: string }> = ({ text, onClick, icon }) => (
  <button
    onClick={onClick}
    className="bg-gemini-gray-100 dark:bg-gemini-dark-card p-3 px-5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gemini-gray-200 dark:hover:bg-gemini-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap"
  >
    {icon && <span className="text-lg">{icon}</span>}
    {text}
  </button>
);

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ onPromptHintClick }) => {
  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:justify-center items-start md:items-center gap-2 md:gap-3 w-full">
      {suggestionChipsData.map(({ text, promptHint, icon }) => (
        <SuggestionChip key={text} text={text} icon={icon} onClick={() => onPromptHintClick(promptHint)} />
      ))}
    </div>
  );
};