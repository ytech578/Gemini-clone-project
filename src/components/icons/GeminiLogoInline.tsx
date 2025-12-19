import React from 'react';
import geminiLogo from '../../assets/gemini.svg';
import '../GeminiLogoInline.css';

interface Props {
    size?: number;
    duration?: number;
}

export default function GeminiLogoInline({ size = 45, duration = 1.5 }: Props) {
    return (
        <div
            className="gemini-logo-container"
            style={{
                width: size,
                height: size,
                '--spin-duration': `${duration}s`
            } as React.CSSProperties}
        >
            <img
                src={geminiLogo}
                alt="Gemini Logo"
                className="gemini-logo-spin"
            />
        </div>
    );
}

