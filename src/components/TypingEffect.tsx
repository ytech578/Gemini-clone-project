import React, { useEffect, useRef, useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TypingEffectProps {
  text: string;
}

export const TypingEffect: React.FC<TypingEffectProps> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const textRef = useRef(text);

  useEffect(() => {
    if (text !== textRef.current) {
      setDisplayedText('');
      indexRef.current = 0;
      textRef.current = text;
    }

    if (!text) return;

    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(timer);
      }
    }, 5); // Fast typing speed (5ms per character)

    return () => clearInterval(timer);
  }, [text]);

  return <MarkdownRenderer content={displayedText || ' '} />;
};