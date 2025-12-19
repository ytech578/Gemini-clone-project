import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChatHistory } from "./components/ChatHistory";
import { ChatInput } from "./components/ChatInput";
import { Header } from "./components/Header";
import { ImageViewer } from "./components/ImageViewer";
import { SettingsMenu } from "./components/SettingsMenu";
import { Sidebar, SidebarRef } from "./components/Sidebar";
import { SuggestionChips } from "./components/SuggestionChips";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useTheme } from "./hooks/useTheme";
import { createChatSession, generateImage } from "./services/geminiService";
import { loadConversationsFromSupabase, loadMessagesFromSupabase, saveConversationToSupabase, saveMessageToSupabase } from "./services/supabaseService";
import type { Chat, ChatMessage, Conversation, GroundingSource, HistoryMessage, Part } from "./types";


/** App component */
const App: React.FC = () => {
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [pendingEditMessage, setPendingEditMessage] = useState<string | null>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('selectedModel');
    return saved || 'gemma-3-27b-it';
  });

  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<SidebarRef | null>(null);

  const { theme, setTheme } = useTheme();

  /** Save selected model to localStorage whenever it changes */
  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  /** Load conversations from Supabase on app startup */
  useEffect(() => {
    const loadSavedConversations = async () => {
      try {
        const savedConversations = await loadConversationsFromSupabase();
        if (savedConversations && savedConversations.length > 0) {
          const conversationsMap = new Map<string, Conversation>();

          for (const conv of savedConversations) {
            const messages = await loadMessagesFromSupabase(conv.id);
            conversationsMap.set(conv.id, {
              id: conv.id,
              title: conv.title,
              messages: messages || [],
              chatSession: createChatSession() as Chat,
            });
          }

          setConversations(conversationsMap);
        }
      } catch (error) {
        console.error('Error loading saved conversations:', error);
      }
    };

    loadSavedConversations();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSettingsMenuOpen &&
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node) &&
        !sidebarRef.current?.settingsButton?.contains(event.target as Node)
      ) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsMenuOpen]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setInputText("");
    setIsLoading(false);
  }, []);

  const handleSelectConversation = (id: string) =>
    setActiveConversationId(id);

  const handleSendMessage = useCallback(
    async (text: string, userParts?: Part[]) => {
      if (isLoading) return;
      setIsLoading(true);

      const parts = userParts || [];
      const hasImage = parts.some((p) => p && typeof p === "object" && "inlineData" in p);
      const isImageGenerationRequest = /\b(create|generate|draw|make|design|show me|picture of|photo of|image of|illustration of)\b/i.test(
        text
      );

      let currentConversationId = activeConversationId;
      let currentConversation: Conversation | undefined;

      if (!currentConversationId) {
        const newId = crypto.randomUUID();
        // createChatSession is a frontend wrapper from the frontend service
        const newChatSession = createChatSession() as Chat;
        const title = text.split(" ").slice(0, 5).join(" ") || "New Chat";

        const newConversation: Conversation = {
          id: newId,
          title,
          messages: [],
          chatSession: newChatSession,
        };

        currentConversationId = newId;
        currentConversation = newConversation;

        setConversations((prev) => new Map(prev).set(newId, newConversation));
        setActiveConversationId(newId);

        // Save conversation to Supabase - MUST await before saving messages (foreign key constraint)
        try {
          await saveConversationToSupabase(newId, title, selectedModel);
        } catch (err) {
          console.error('Failed to save conversation:', err);
        }
      } else {
        currentConversation = conversations.get(currentConversationId);
      }

      if (!currentConversation) {
        console.error("Could not find or create a conversation.");
        setIsLoading(false);
        return;
      }

      // Build conversation history BEFORE adding the new messages
      const previousMessages = currentConversation.messages;
      const history = previousMessages
        .filter(msg => msg.role === 'user' || msg.role === 'model')
        .filter(msg => msg.parts && msg.parts.length > 0)
        .map(msg => ({
          role: msg.role as 'user' | 'model',
          parts: msg.parts.filter(p => p.text)
        }))
        .filter(msg => msg.parts.length > 0);

      const userMessage: ChatMessage = { role: "user", parts: parts.length > 0 ? parts : [{ text }] };
      const modelMessagePlaceholder: ChatMessage = { role: "model", parts: [{ text: "" }] };

      setConversations((prev) =>
        new Map(prev).set(currentConversationId!, {
          ...currentConversation!,
          messages: [...currentConversation!.messages, userMessage, modelMessagePlaceholder],
        })
      );

      saveMessageToSupabase(currentConversationId!, userMessage).catch(err =>
        console.error('Failed to save user message:', err)
      );

      setInputText("");

      try {
        // Image GENERATION (create new images from text) - only if no image uploaded 
        if (isImageGenerationRequest && !hasImage) {
          const imageParts = await generateImage(parts.length > 0 ? parts : [{ text }]);
          const modelMessage: ChatMessage = { role: "model", parts: imageParts };

          setConversations((prev) => {
            const convo = prev.get(currentConversationId!);
            if (!convo) return prev;
            const updated = [...convo.messages];
            updated[updated.length - 1] = modelMessage;
            return new Map(prev).set(currentConversationId!, { ...convo, messages: updated });
          });

          // Save model's image response to Supabase
          saveMessageToSupabase(currentConversationId!, modelMessage).catch(err =>
            console.error('Failed to save model message:', err)
          );
        }
        // Image ANALYSIS or regular chat (vision or text)
        else {
          const session = currentConversation.chatSession;
          if (!session) throw new Error("chat session missing for streaming.");

          // If user uploaded images, send the full parts array for multimodal/vision
          const streamArgs: {
            message: string;
            model: string;
            history: HistoryMessage[];
            parts?: Part[];
          } = {
            message: text,
            model: selectedModel,
            history
          };

          if (hasImage) {
            // Add text to parts if we have a text message
            const allParts = text ? [{ text }, ...parts] : parts;
            streamArgs.parts = allParts;
          }

          const stream = session.sendMessageStream(streamArgs);
          let fullResponse = "";
          const sources: GroundingSource[] = [];

          // Consume the async generator
          for await (const chunk of stream) {
            const chunkText = (chunk && typeof chunk.text === "string") ? chunk.text : String(chunk ?? "");
            fullResponse += chunkText;

            const groundingChunks = chunk?.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && Array.isArray(groundingChunks)) {
              const newSources: GroundingSource[] = groundingChunks
                .map((c) => c.web)
                .filter((web) => web && web.uri)
                .map((web) => ({ uri: web!.uri, title: web!.title || "" }));
              if (newSources.length > 0) sources.push(...newSources);
            }

            setConversations((prev) => {
              const convo = prev.get(currentConversationId!);
              if (!convo) return prev;
              const newMessages = [...convo.messages];
              const uniqueSources = sources.filter((s, i, arr) => i === arr.findIndex((x) => x.uri === s.uri));
              const modelMessage: ChatMessage = {
                role: "model",
                parts: [{ text: fullResponse }],
                sources: uniqueSources,
              };
              newMessages[newMessages.length - 1] = modelMessage;
              return new Map(prev).set(currentConversationId!, { ...convo, messages: newMessages });
            });
          }

          // Save the final model response to Supabase (after streaming completes)
          const finalModelMessage: ChatMessage = {
            role: "model",
            parts: [{ text: fullResponse }],
            sources: sources.filter((s, i, arr) => i === arr.findIndex((x) => x.uri === s.uri)),
          };
          saveMessageToSupabase(currentConversationId!, finalModelMessage).catch(err =>
            console.error('Failed to save streamed model message:', err)
          );
        }
      } catch (err) {
        console.error("Gemini API error:", err);
        const message = err instanceof Error ? err.message : String(err);
        const errorMessage: ChatMessage = { role: "error", parts: [{ text: message }] };

        setConversations((prev) => {
          const convo = prev.get(currentConversationId!);
          if (!convo) return prev;
          const newMessages = [...convo.messages];
          newMessages[newMessages.length - 1] = errorMessage;
          return new Map(prev).set(currentConversationId!, { ...convo, messages: newMessages });
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeConversationId, conversations, isLoading]
  );

  const activeConversation = activeConversationId ? conversations.get(activeConversationId) : undefined;
  const messagesToShow = activeConversation?.messages ?? [];

  // Handle editing a user message - removes all messages after it and regenerates
  const handleEditMessage = useCallback(
    (messageIndex: number, newText: string) => {
      if (!activeConversationId || isLoading) return;

      const currentConversation = conversations.get(activeConversationId);
      if (!currentConversation) return;

      // Remove all messages from this index onwards
      const trimmedMessages = currentConversation.messages.slice(0, messageIndex);

      // Update the conversation with trimmed messages
      setConversations((prev) =>
        new Map(prev).set(activeConversationId, {
          ...currentConversation,
          messages: trimmedMessages,
        })
      );

      // Set pending message to trigger send via useEffect
      setPendingEditMessage(newText);
    },
    [activeConversationId, conversations, isLoading]
  );

  // Effect to handle sending the edited message after state update
  useEffect(() => {
    if (pendingEditMessage && !isLoading) {
      handleSendMessage(pendingEditMessage);
      setPendingEditMessage(null);
    }
  }, [pendingEditMessage, isLoading, handleSendMessage]);

  return (
    <div className="h-screen flex bg-white dark:bg-gemini-dark text-gray-800 dark:text-gray-200 font-sans overflow-hidden">
      <Sidebar
        ref={sidebarRef}
        isSidebarOpen={isSidebarOpen}
        onNewChat={startNewChat}
        toggleSidebar={() => setIsSidebarOpen((p) => !p)}
        onToggleSettings={() => setIsSettingsMenuOpen((p) => !p)}
        conversations={Array.from(conversations.values())}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
      />

      {isSettingsMenuOpen && (
        <SettingsMenu ref={settingsMenuRef} theme={theme} setTheme={setTheme} onClose={() => setIsSettingsMenuOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setIsSidebarOpen((p) => !p)} />

        <main className="flex-1 flex flex-col items-center overflow-hidden w-full">
          {!activeConversationId ? (
            <div className={`flex-1 flex flex-col w-full h-full relative ${isInputExpanded ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'}`}>
              {/* Layout ordering: Mobile = greeting→chips→input, Desktop = greeting→input→chips */}
              <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto md:justify-center">
                {/* Welcome greeting */}
                {!isInputExpanded && (
                  <div className="pt-8 md:pt-0 md:pb-8 w-full max-w-3xl px-4 mx-auto order-1">
                    <WelcomeScreen />
                  </div>
                )}

                {/* Suggestion chips - order-2 on mobile (middle), order-3 on desktop (after input) */}
                {!isInputExpanded && (
                  <div className="flex-1 md:flex-none w-full max-w-3xl px-4 py-6 md:py-0 md:mb-6 mx-auto order-2 md:order-3">
                    <SuggestionChips onPromptHintClick={setInputText} />
                  </div>
                )}

                {/* Input area - order-3 on mobile (bottom), order-2 on desktop (before chips) */}
                <div className="mt-auto md:mt-0 w-full max-w-3xl px-4 pb-4 md:pb-6 mx-auto z-20 order-3 md:order-2">
                  <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} isWelcomeScreen value={inputText} onChange={setInputText} selectedModel={selectedModel} onModelChange={setSelectedModel} onExpandedChange={setIsInputExpanded} />
                </div>
              </div>

              <div className="hidden md:block w-full text-center py-4 mt-auto z-20">
                <p className="invisible text-xs text-[12px] text-[#444746] dark:text-[#c4c7c5]">
                  Gemini can make mistakes, so double-check it
                </p>
              </div>
            </div>

          ) : (
            <div className="flex-1 w-full flex flex-col relative overflow-hidden">
              {/* Scrollable Chat Area */}
              <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center pb-4">
                <div className="w-full max-w-[830px] flex-1 flex flex-col px-4">
                  <ChatHistory
                    messages={messagesToShow}
                    isLoading={isLoading}
                    onViewImage={setViewingImage}
                    onEditMessage={handleEditMessage}
                    conversationId={activeConversationId}
                  />
                  {/* Spacer to prevent content being hidden behind input if needed, though flex should handle it */}
                  <div className="h-4" />
                </div>
              </div>

              {/* Fixed Input Area */}
              <div className="w-full flex-none bg-white dark:bg-gemini-dark relative z-10">
                {/* Gradient Fade */}
                <div className="absolute -top-10 left-0 w-full h-10 pointer-events-none bg-gradient-to-t from-white dark:from-gemini-dark to-transparent" />

                <div className="w-full max-w-[830px] mx-auto px-4">
                  <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} isWelcomeScreen={false} value={inputText} onChange={setInputText} selectedModel={selectedModel} onModelChange={setSelectedModel} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {viewingImage && <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />}
    </div>
  );
};

export default App;