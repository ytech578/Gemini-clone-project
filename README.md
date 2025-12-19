# Gemini Clone 2.0

A modern, feature-rich clone of Google's Gemini AI chat interface built with React, TypeScript, and Tailwind CSS.

![Gemini Clone](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-blue)

## Features

- 💬 **Real-time AI Chat** - Powered by Google's Gemini API
- 🖼️ **Image Upload & Vision** - Send images for AI analysis
- 🎨 **Dark/Light Theme** - Toggle between themes
- 📝 **Markdown Support** - Renders code blocks, tables, and more
- 💾 **Conversation History** - Save and load past conversations
- ✏️ **Edit Messages** - Edit your latest prompt
- 🔊 **Text-to-Speech** - Listen to AI responses
- 🎤 **Voice Input** - Speak your prompts
- ⌨️ **Typing Effect** - Gemini-like word-by-word typing animation
- 📱 **Responsive Design** - Works on all screen sizes

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Gemini API key
- Supabase account (for conversation storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gemini-clone-2.0.git
   cd gemini-clone-2.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up the database**
   
   Run the SQL in `supabase-schema.sql` in your Supabase SQL editor.

5. **Start the development server**
   ```bash
   # Terminal 1 - Start the frontend
   npm run dev

   # Terminal 2 - Start the backend
   cd server
   node index.js
   ```

6. **Open in browser**
   
   Navigate to `http://localhost:5173`

## Project Structure

```
gemini-clone-2.0/
├── src/
│   ├── components/     # React components
│   │   ├── icons/      # SVG icon components
│   │   └── ...
│   ├── lib/            # Utilities (Supabase client)
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Main app component
│   └── index.css       # Global styles
├── server/
│   └── index.js        # Express backend server
├── public/             # Static assets
└── ...config files
```

## Key Components

| Component | Description |
|-----------|-------------|
| `ChatInput` | Message input with image upload, voice input |
| `ChatMessage` | Individual message with markdown, actions |
| `ChatHistory` | Scrollable message list with smooth scrolling |
| `Sidebar` | Navigation with conversation history |
| `MarkdownRenderer` | Renders markdown with code blocks |
| `TypingEffect` | Character-by-character typing animation |

## License

MIT License - feel free to use this project for learning or personal use.

## Acknowledgments

- Design inspired by [Google Gemini](https://gemini.google.com)
- Built with [Vite](https://vitejs.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
