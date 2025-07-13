'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Menu, Building2, LogOut } from 'lucide-react';
import { Conversation, Message, Theme } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';
import { getThemeClasses } from '@/lib/theme';
import { Sidebar } from './Sidebar';
import { SettingsModal } from './SettingsModal';
import { QuestionSuggestions } from './QuestionSuggestions';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { useRouter } from 'next/navigation';
import React from 'react';
import { Paperclip } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('light');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const themeClasses = getThemeClasses(theme);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('vb-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'very-dark'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  // Save theme to localStorage whenever it changes
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('vb-theme', newTheme);
  };

  useEffect(() => {
    const checkAuth = async () => {
      setIsAuthChecking(true);
      try {
        const res = await fetch('/api/auth-check');
        if (res.status === 401) {
          localStorage.setItem('auth', 'false');
          router.push('/');
          return;
        }
      } catch {
        localStorage.setItem('auth', 'false');
        router.push('/');
        return;
      }
      setIsAuthChecking(false);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/check-admin');
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth' && e.newValue === 'false') {
        router.push('/');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          if (data.length > 0) {
            const last = data[0];
            setCurrentConversationId(last.id);
            setMessages(last.messages || []);
          }
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const generateConversationTitle = (text: string) => {
    const words = text.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  const createNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        role: 'assistant',
        content: "Hello! I'm your VB Capital AI Assistant. I can help with investment analysis, portfolio insights, and market trends. How can I assist you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSidebarOpen(false);
  };

  const selectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setMessages(conv.messages);
      setSidebarOpen(false);
    }
  };

  const updateConversationMessages = (id: string, newMessages: Message[]) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, messages: newMessages, time: 'Just now' } : conv
      )
    );
  };

  const sendFeedback = (msg: Message, fb: 'helpful' | 'not-helpful') => {
    console.log(`Feedback: ${fb} for message:`, msg);
  };

  const sendMessage = async (messageText?: string, file?: File): Promise<void> => {
    const text = messageText || input;
    if (!text.trim() && !file) return;

    const userMessage: Message = {
      role: 'user',
      content: file ? `📎 Uploaded file: ${file.name}${text ? `\n\n${text}` : ''}` : text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Handle file upload
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error('File upload failed');
        }
        
        const uploadData = await uploadRes.json();
        userMessage.content = `[file:${file.name}](${uploadData.url})${text ? `\n\n${text}` : ''}`;
      } catch (error) {
        console.error('File upload error:', error);
        // Show error to user
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Sorry, there was an error uploading your file. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const title = generateConversationTitle(text);
    let finalMessages = [...newMessages];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_VB_API_KEY && {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_VB_API_KEY}`,
          }),
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to get AI response';
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: { content: string } = await res.json();

      if (!data.content) {
        throw new Error('No content received from AI');
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
    }

    // Save conversation
    try {
      if (currentConversationId) {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentConversationId, title, messages: finalMessages }),
        });
        updateConversationMessages(currentConversationId, finalMessages);
      } else {
        const result = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, messages: finalMessages }),
        });
        const resultData = await result.json();
        if (resultData?.id) {
          setCurrentConversationId(resultData.id);
          const updated = await fetch('/api/conversations');
          if (updated.ok) {
            const conversationsData = await updated.json();
            setConversations(conversationsData);
          }
        }
      }
    } catch (saveError) {
      console.error('Failed to save conversation:', saveError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      localStorage.setItem('auth', 'false');
      window.dispatchEvent(new Event('storage'));
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((conv) => conv.id !== id));
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  if (isAuthChecking) {
    return (
      <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex ${themeClasses.bg}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        onNewConversation={createNewConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={handleDeleteConversation}
        currentConversationId={currentConversationId}
        onShowSettings={() => setShowSettings(true)}
        theme={theme}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Mobile Optimized */}
        <header className={`border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm ${themeClasses.cardBg} ${themeClasses.border}`}>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg transition-colors ${themeClasses.hoverSecondary} ${themeClasses.focus}`}
              type="button"
            >
              <Menu className={`w-5 h-5 ${themeClasses.textMuted}`} />
            </button>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SafeImage
                src="/vb.png"
                alt="VB Capital"
                className="w-9 h-7 sm:w-9 sm:h-7 flex-shrink-0"
                theme={theme}
                fallback={<Building2 className={`w-5 h-5 ${themeClasses.textMuted}`} />}
              />
              <div className="min-w-0">
                <h1 className={`font-semibold text-sm sm:text-base truncate ${themeClasses.text}`}>
                  VB Capital Assistant
                </h1>
                <div className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
                  
                  <span className="hidden sm:inline">Online</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors ${themeClasses.buttonSecondary} ${themeClasses.text}`}
              >
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-1 sm:gap-2 transition-colors shadow"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content - Mobile Optimized */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-6 space-y-0">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                theme={theme}
                onFeedback={msg.role === 'assistant' ? sendFeedback : undefined}
              />
            ))}
            {isLoading && <TypingIndicator theme={theme} />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input Section - Mobile Optimized */}
        <div className={`border-t px-3 sm:px-6 py-3 sm:py-4 ${themeClasses.cardBg} ${themeClasses.border}`}>
          <div className="max-w-4xl mx-auto">
            {messages.length <= 1 && (
              <div className="mb-3 sm:mb-4">
                <QuestionSuggestions
                  onSelectQuestion={sendMessage}
                  conversations={conversations}
                  theme={theme}
                />
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                                <textarea
                  ref={inputRef}
                  className={`
                    w-full p-4 pr-12 border-1 border-green-200 rounded-2xl resize-none focus:outline-none transition-colors text-sm sm:text-base
                    min-h-[56px] max-h-[120px] sm:max-h-[160px] md:max-h-[200px] overflow-hidden sm:overflow-y-auto
                    ${themeClasses.inputBg} ${themeClasses.text} focus:border-green-400 focus:ring-2 focus:ring-green-200
                    placeholder-gray-500
                  `}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message…"
                  rows={1}
                  disabled={isLoading}
                />
                <input
                  type="file"
                  id="fileUpload"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      sendMessage(undefined, f);
                      e.target.value = '';
                    }
                  }}
                />




                <label
                  htmlFor="fileUpload"
                  className="absolute top-1/2 right-2 sm:right-3 transform -translate-y-1/2 cursor-pointer text-emerald-500 hover:text-emerald-600 transition-colors"
                  title="Upload file"
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </label>
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center min-w-[48px] sm:min-w-[56px]"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <p className={`text-xs mt-2 text-center ${themeClasses.textMuted} px-2`}>
              You can upload files like PDF, Word, or images for the AI to read and respond.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}