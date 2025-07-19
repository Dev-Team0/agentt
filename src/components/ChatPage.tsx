'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, Building2, LogOut, Paperclip } from 'lucide-react';
import { Conversation, Message, Theme } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';
import { getThemeClasses } from '@/lib/theme';
import { Sidebar } from './Sidebar';
import { SettingsModal } from './SettingsModal';
import { QuestionSuggestions } from './QuestionSuggestions';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { useRouter } from 'next/navigation';

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

  // Load theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('vb-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'very-dark'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('vb-theme', newTheme);
  };

  // Auth check
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

  // Admin flag
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

  // Logout sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth' && e.newValue === 'false') {
        router.push('/');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  // Load conversations
  useEffect(() => {
    if (isAuthChecking) return;
    (async () => {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
        if (data.length > 0) {
          setCurrentConversationId(data[0].id);
          setMessages(data[0].messages);
        }
      }
    })();
  }, [isAuthChecking]);

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Autofocus input
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
        content:
          "Hello! I'm your VB Capital AI Assistant. I can help with investment analysis, portfolio insights, and market trends. How can I assist you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSidebarOpen(false);
  };

  const selectConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setMessages(conv.messages);
      setSidebarOpen(false);
    }
  };

  const updateConversationMessages = (id: string, newMessages: Message[]) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === id ? { ...conv, messages: newMessages, time: 'Just now' } : conv
      )
    );
  };

  const sendFeedback = (msg: Message, fb: 'helpful' | 'not-helpful') => {
    console.log(`Feedback: ${fb} for message:`, msg);
  };

  // Send & persist
  const sendMessage = async (messageText?: string, file?: File): Promise<void> => {
    const text = messageText ?? input;
    if (!text.trim() && !file) return;

    // Build user message
    const userMessage: Message = {
      role: 'user',
      content: file
        ? `📎 Uploaded file: ${file.name}${text ? `\n\n${text}` : ''}`
        : text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Handle file upload
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const { url } = await uploadRes.json();
      userMessage.content = `[file:${file.name}](${url})${text ? `\n\n${text}` : ''}`;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Call AI
    let aiMessage: Message;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_VB_API_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { content } = await res.json();
      aiMessage = {
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    } catch (err) {
      console.error('Chat error:', err);
      aiMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    const finalMessages = [...newMessages, aiMessage];
    setMessages(finalMessages);

    // Persist to /api/conversations
    const title = generateConversationTitle(text);
    try {
      if (currentConversationId) {
        // Update existing
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentConversationId,
            title,
            messages: finalMessages,
          }),
        });
        updateConversationMessages(currentConversationId, finalMessages);
      } else {
        // Create new
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            messages: finalMessages,
          }),
        });
        const { id } = await createRes.json();
        setCurrentConversationId(id);

        // Refresh sidebar list
        const all = await fetch('/api/conversations');
        if (all.ok) setConversations(await all.json());
      }
    } catch (saveError) {
      console.error('Failed to save conversation:', saveError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    router.push('/');
    localStorage.setItem('auth', 'false');
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeleteConversation = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConversations(prev => prev.filter(conv => conv.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    }
  };

  if (isAuthChecking) {
    return (
      <div className={`flex items-center justify-center h-screen ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
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
        {/* Header */}
        <header
          className={`border-b px-6 py-4 flex items-center justify-between shadow-sm ${themeClasses.cardBg} ${
            themeClasses.border
          }`}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg transition-colors ${themeClasses.hoverSecondary} ${themeClasses.focus}`}
              type="button"
            >
              <Menu className={`w-5 h-5 ${themeClasses.textMuted}`} />
            </button>
            <div className="flex items-center gap-3">
              <SafeImage
                src="/vb.png"
                alt="VB Capital"
                className="w-9 h-7"
                fallback={<Building2 className={`w-5 h-5 ${themeClasses.textMuted}`} />}
              />
              <div>
                <h1 className={`font-semibold ${themeClasses.text}`}>VB Capital Assistant</h1>
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Online
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className={`text-sm px-4 py-2 rounded-lg transition-colors ${themeClasses.buttonSecondary} ${themeClasses.text}`}
              >
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-2 transition-colors shadow"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-0">
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

        {/* Chat Input Section */}
        <div className={`border-t px-6 py-4 ${themeClasses.cardBg} ${themeClasses.border}`}>
          <div className="max-w-4xl mx-auto">
            {messages.length <= 1 && (
              <QuestionSuggestions onSelectQuestion={sendMessage} conversations={conversations} theme={theme} />
            )}

            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  className={`
                    w-full
                    p-4 pr-12
                    border rounded-2xl
                    resize-none
                    focus:outline-none
                    transition-colors
                    text-sm sm:text-base
                    ${themeClasses.inputBg}
                    ${themeClasses.inputBorder}
                    ${themeClasses.text}
                    ${themeClasses.inputFocus}
                    placeholder-gray-500
                  `}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message… (Press Enter to send)"
                  rows={1}
                  style={{ minHeight: '56px', maxHeight: '120px' }}
                  disabled={isLoading}
                />

                <input
                  type="file"
                  id="fileUpload"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      sendMessage(undefined, file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="fileUpload"
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer text-emerald-500 hover:text-emerald-600 transition-colors"
                  title="Upload file"
                >
                  <Paperclip className="w-5 h-5" />
                </label>
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white p-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-xs mt-2 text-center ${themeClasses.textMuted}`}>
              You can upload files like PDF, Word, or images for the AI to read and respond.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


