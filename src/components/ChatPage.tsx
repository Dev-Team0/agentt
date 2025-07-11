'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Send, Menu, Building2, LogOut } from 'lucide-react';
import { Conversation, Message, Theme } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';
import { getThemeClasses } from '@/lib/theme';
import { SettingsModal } from './SettingsModal';
import { QuestionSuggestions } from './QuestionSuggestions';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { useRouter } from 'next/navigation';

// Dynamically import the named Sidebar export
const Sidebar = dynamic(
  () => import('./Sidebar').then((mod) => mod.Sidebar),
  { ssr: false }
);

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

  // Load theme from localStorage (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = localStorage.getItem('vb-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'very-dark'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vb-theme', newTheme);
    }
  };

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth-check');
        if (res.status === 401) {
          localStorage.setItem('auth', 'false');
          router.replace('/');
          return;
        }
      } catch {
        localStorage.setItem('auth', 'false');
        router.replace('/');
        return;
      }
      setIsAuthChecking(false);
    }
    checkAuth();
  }, [router]);

  // Admin flag
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/check-admin');
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, []);

  // Sync logout across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth' && e.newValue === 'false') {
        router.replace('/');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  // Load conversations
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0) {
          setCurrentConversationId(data[0].id);
          setMessages(data[0].messages || []);
        }
      }
    }
    load();
  }, []);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input whenever messages or loading state changes
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Helpers
  const generateConversationTitle = (text: string) => {
    const snippet = text.split(' ').slice(0, 4).join(' ');
    return snippet.length > 30 ? snippet.slice(0, 30) + '…' : snippet;
  };

  // Conversation handlers
  const createNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        role: 'assistant',
        content: "Hello! I'm your VB Capital AI Assistant. How can I assist you today?",
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
    console.log(`Feedback: ${fb}`, msg);
  };

  // Send message (with optional file upload)
  const sendMessage = async (overrideText?: string, file?: File) => {
    const text = overrideText ?? input;
    if (!text.trim() && !file) return;

    const userMessage: Message = {
      role: 'user',
      content: file
        ? `📎 Uploaded file: ${file.name}${text ? `\n\n${text}` : ''}`
        : text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Handle file if one was selected
    if (file) {
      const form = new FormData();
      form.append('file', file);
      const upl = await fetch('/api/upload', { method: 'POST', body: form });
      const { url } = await upl.json();
      userMessage.content = `[file:${file.name}](${url})${text ? `\n\n${text}` : ''}`;
    }

    // Optimistically update UI
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let finalMessages = newMessages;
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
      const aiMessage: Message = {
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
    } catch (err) {
      console.error('Chat error:', err);
      finalMessages = [
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(finalMessages);
    }

    // Persist conversation
    try {
      const title = generateConversationTitle(text);
      if (currentConversationId) {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentConversationId, title, messages: finalMessages }),
        });
        updateConversationMessages(currentConversationId, finalMessages);
      } else {
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, messages: finalMessages }),
        });
        const { id } = await createRes.json();
        setCurrentConversationId(id);
        const all = await fetch('/api/conversations');
        if (all.ok) setConversations(await all.json());
      }
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth', 'false');
      window.dispatchEvent(new Event('storage'));
    }
    router.replace('/');
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
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
    <div className={`flex h-screen flex-col md:flex-row ${themeClasses.bg}`}>
      {/* Sidebar (mobile overlay, desktop static) */}
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

      {/* Settings modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 py-3 border-b shadow-sm ${themeClasses.cardBg} ${themeClasses.border}`}>
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2" onClick={() => setSidebarOpen(true)}>
              <Menu className={`w-5 h-5 ${themeClasses.textMuted}`} />
            </button>
            <SafeImage
              src="/vb.png"
              alt="VB Capital"
              className="w-8 h-6"
              theme={theme}
              fallback={<Building2 className={`w-5 h-5 ${themeClasses.textMuted}`} />}
            />
            <div>
              <h1 className={`font-semibold text-lg ${themeClasses.text}`}>VB Capital Assistant</h1>
              <div className="text-sm text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Online
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className={`hidden md:inline-block text-sm px-3 py-1 rounded-lg ${themeClasses.buttonSecondary} ${themeClasses.text}`}
              >
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        {/* Messages list */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-xl space-y-4">
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
        </main>

        {/* Input section */}
        <footer className={`border-t px-4 py-3 ${themeClasses.cardBg} ${themeClasses.border}`}>
          <div className="mx-auto max-w-xl space-y-2">
            {messages.length <= 1 && (
              <QuestionSuggestions
                onSelectQuestion={sendMessage}
                conversations={conversations}
                theme={theme}
              />
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                className={`flex-1 resize-none rounded-2xl border p-3 focus:outline-none transition-colors ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.text}`}
                rows={1}
                placeholder="Type your message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
                }
                disabled={isLoading}
                style={{ maxHeight: '120px' }}
              />
              <input
                type="file"
                id="fileUpload"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    sendMessage(undefined, file);
                    e.currentTarget.value = '';
                  }
                }}
                className="hidden"
              />
              <label
                htmlFor="fileUpload"
                className="cursor-pointer text-emerald-500 hover:text-emerald-600"
                title="Upload file"
              >
                📎
              </label>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="rounded-full p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:opacity-50 text-white"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-center text-xs ${themeClasses.textMuted}`}>
              You can upload PDF, Word, or images for the AI to read and respond.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
