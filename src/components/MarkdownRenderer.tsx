import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';



interface MarkdownRendererProps {
  content: string;
}

// Smart language name formatter
const formatLanguageName = (lang: string): string => {
  if (!lang) return 'Code';
  const lower = lang.toLowerCase();

  // Common overrides
  const overrides: Record<string, string> = {
    js: 'JavaScript', ts: 'TypeScript', py: 'Python',
    cs: 'C#', cpp: 'C++', 'c++': 'C++',
    sh: 'Shell', ps1: 'PowerShell',
    jsx: 'JSX', tsx: 'TSX',
  };

  if (overrides[lower]) return overrides[lower];

  // Acronyms (html, css, xml, sql, json, php...) - typically 3-4 chars
  if (lower.length <= 4 && /^(html|css|xml|sql|json|php|yaml|yml|bash)$/.test(lower)) {
    return lower.toUpperCase();
  }

  // Default: Title Case (e.g. "rust" -> "Rust", "ruby" -> "Ruby")
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// Heuristic language detection
const detectLanguageFromCode = (code: string): string => {
  const c = code.trim();
  if (c.includes('import React') || c.includes('export default function ') || c.includes('className=')) return 'tsx';
  if (c.startsWith('<!DOCTYPE html>') || c.includes('</div>')) return 'html';
  if (c.includes('function') && c.includes('return') && !c.includes(':')) return 'js';
  if (c.includes('interface ') || c.includes('type ') || /: \w+/.test(c)) return 'ts';
  if (c.includes('def ') && c.includes(':')) return 'py';
  if (c.includes('public static void main')) return 'java';
  if (c.includes('#include <')) return 'cpp';
  if (c.includes('using System;')) return 'cs';
  if (c.startsWith('{') && c.endsWith('}')) return 'json';
  if (c.includes('SELECT') && c.includes('FROM')) return 'sql';
  if (c.includes('body {') || c.includes('margin:') || c.includes('color:')) return 'css';
  return '';
};

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const codeText = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  // Determine display name
  let langKey = match ? match[1] : detectLanguageFromCode(codeText);
  let displayName = formatLanguageName(langKey);
  const syntaxLang = langKey || 'text';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="!ml-0 min-w-[695px] max-w-[720px] rounded-2xl overflow-hidden my-4 bg-[#F0F4F9] dark:bg-[#1e1f20]">
      {/* Header */}
      <div className="h-12 flex items-center justify-between mt-1 mb-0.5 pl-4 pr-2 py-2 bg-[#F0F4F9] dark:bg-[#1e1f20] border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-[14px] text-[#444746] dark:text-[#c4c7c5] select-none">
          {displayName}
        </span>
        <div className="relative group">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center rounded-full p-2.5 text-[#444746] dark:text-[#c4c7c5] hover:bg-gray-200 dark:hover:bg-gemini-gray-700 transition-colors"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          {/* Tooltip below the icon */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 text-xs text-white dark:text-black  bg-black dark:bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {copied ? 'Copied!' : 'Copy code'}
          </span>
        </div>
      </div>

      {/* Code Content - Plain text, no syntax highlighting */}
      <div className="overflow-x-auto bg-[#F0F4F9] dark:bg-[#1e1f20]">
        <pre className="p-4 m-0 text-sm font-mono text-[#444746] dark:text-[#c4c7c5] leading-relaxed whitespace-pre overflow-x-auto">
          <code>{codeText}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate dark:prose-invert w-full break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          pre: ({ children }) => <>{children}</>,
          h1: (props) => <h1 className="text-3xl font-semibold mt-6 mb-4 text-gray-900 dark:text-gray-100" {...props} />,
          h2: (props) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-gray-900 dark:text-gray-100" {...props} />,
          h3: (props) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
          p: (props) => <p className="mb-4 text-gray-800 dark:text-gray-300 leading-7" {...props} />,
          ul: (props) => <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-800 dark:text-gray-300" {...props} />,
          ol: (props) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-gray-800 dark:text-gray-300" {...props} />,
          a: (props) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
          blockquote: (props) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-400" {...props} />,
          table: (props) => <div className="overflow-x-auto mb-4"><table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700" {...props} /></div>,
          thead: (props) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
          tr: (props) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50" {...props} />,
          th: (props) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" {...props} />,
          td: (props) => <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};