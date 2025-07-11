'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  () => import('./Sidebar').then(mod => mod.Sidebar),
  { ssr: false }
);

export default function ChatPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('light');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const themeClasses = getThemeClasses(theme);

  // Load saved theme
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('vb-theme') as Theme;
    if (t && ['light', 'dark', 'very-dark'].includes(t)) {
      setTheme(t);
    }
  }, []);

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vb-theme', t);
    }
  };

  // Auth check
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth-check');
        if (r.status === 401) throw new Error();
      } catch {
        if (typeof window !== 'undefined') localStorage.setItem('auth', 'false');
        router.replace('/');
        return;
      }
      setIsAuthChecking(false);
    })();
  }, [router]);

  // Admin flag
  useEffect(() => {
    fetch('/api/check-admin')
      .then(r => r.json())
      .then(d => setIsAdmin(d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  // Sync logout across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth' && e.newValue === 'false') {
        router.replace('/');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router]);

  // Load conversations
  useEffect(() => {
    (async () => {
      const r = await fetch('/api/conversations');
      if (r.ok) {
        const data: Conversation[] = await r.json();
        setConversations(data);
        if (data.length) {
          setCurrentConversationId(data[0].id);
          setMessages(data[0].messages || []);
        }
      }
    })();
  }, []);

  // Scroll in desktop only
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input after send
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [messages, isLoading]);

  const genTitle = (txt: string) => {
    const s = txt.split(' ').slice(0, 4).join(' ');
    return s.length > 30 ? s.slice(0, 30) + '…' : s;
  };

  // Conversation handlers
  const createNew = () => {
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

  const selectConv = (id: string) => {
    const c = conversations.find(x => x.id === id);
    if (c) {
      setCurrentConversationId(id);
      setMessages(c.messages);
      setSidebarOpen(false);
    }
  };

  const updateMsgs = (id: string, msgs: Message[]) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, messages: msgs, time: 'Just now' } : c))
    );
  };

  const sendFB = (msg: Message, fb: 'helpful' | 'not-helpful') => {
    console.log(`Feedback ${fb}`, msg);
  };

  // Send message + optional file upload
  const sendMessage = async (overrideText?: string, file?: File) => {
    const txt = overrideText ?? input;
    if (!txt.trim() && !file) return;

    const userMsg: Message = {
      role: 'user',
      content: file
        ? `📎 Uploaded file: ${file.name}${txt ? `\n\n${txt}` : ''}`
        : txt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const { url } = await up.json();
      userMsg.content = `[file:${file.name}](${url})${txt ? `\n\n${txt}` : ''}`;
    }

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);

    let final = newMsgs;
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_VB_API_KEY}`,
        },
        body: JSON.stringify({ messages: newMsgs }),
      });
      if (!r.ok) throw new Error(await r.text());
      const { content } = await r.json();
      const aiMsg: Message = {
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      final = [...newMsgs, aiMsg];
      setMessages(final);
    } catch (e) {
      console.error(e);
      final = [
        ...newMsgs,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(final);
    }

    // Persist conversation
    try {
      const title = genTitle(txt);
      if (currentConversationId) {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentConversationId, title, messages: final }),
        });
        updateMsgs(currentConversationId, final);
      } else {
        const r2 = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, messages: final }),
        });
        const { id } = await r2.json();
        setCurrentConversationId(id);
        const all = await fetch('/api/conversations');
        if (all.ok) setConversations(await all.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth', 'false');
      window.dispatchEvent(new Event('storage'));
    }
    router.replace('/');
  };

  // Delete conv
  const deleteConv = async (id: string) => {
    const r = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (r.ok) {
      setConversations(prev => prev.filter(x => x.id !== id));
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
    <div className={`flex h-screen flex-col md:flex-row ${themeClasses.bg} overflow-hidden`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        onNewConversation={createNew}
        onSelectConversation={selectConv}
        onDeleteConversation={deleteConv}
        currentConversationId={currentConversationId}
        onShowSettings={() => setShowSettings(true)}
        theme={theme}
      />

      {/* Settings */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className={`flex items-center justify-between px-4 py-2 border-b shadow-sm ${themeClasses.cardBg} ${themeClasses.border}`}>
          <div className="flex items-center gap-2">
            <button className="md:hidden p-1" onClick={() => setSidebarOpen(true)}>
              <Menu className={`w-5 h-5 ${themeClasses.textMuted}`} />
            </button>
            <SafeImage
              src="/vb.png"
              alt="VB"
              className="w-7 h-5"
              theme={theme}
              fallback={<Building2 className={`w-5 h-5 ${themeClasses.textMuted}`} />}
            />
            <h1 className={`font-semibold text-base ${themeClasses.text}`}>VB Capital Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className={`text-xs px-2 py-1 rounded ${themeClasses.buttonSecondary} ${themeClasses.text}`}
              >
                Admin
              </button>
            )}
            <button onClick={logout} className="p-1 rounded bg-emerald-600 text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages (desktop scroll) */}
        <main className={`flex-1 ${themeClasses.text} md:overflow-auto p-2`}>
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} theme={theme} onFeedback={m.role === 'assistant' ? sendFB : undefined} />
          ))}
          {isLoading && <TypingIndicator theme={theme} />}
          <div ref={messagesEndRef} />
        </main>

        {/* Input & footer */}
        <footer className={`border-t px-4 py-2 flex flex-col gap-1 ${themeClasses.cardBg} ${themeClasses.border}`}>
          {messages.length <= 1 && (
            <QuestionSuggestions onSelectQuestion={sendMessage} conversations={conversations} theme={theme} />
          )}
          <div className="flex items-center gap-2">
            <textarea
              ref={inputRef}
              className={`flex-1 resize-none rounded border p-2 text-sm focus:outline-none transition-colors ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.text}`}
              placeholder="Type your message... (Press Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              disabled={isLoading}
              rows={1}
            />
            <input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  sendMessage(undefined, f);
                  e.currentTarget.value = '';
                }
              }}
            />
            <label htmlFor="file" className="text-xl cursor-pointer text-emerald-500" title="Upload file">
              📎
            </label>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded bg-emerald-600 text-white"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className={`text-center text-xs ${themeClasses.textMuted}`}>
            You can upload files like PDF, Word, or images for the AI to read and respond.
          </p>
        </footer>
      </div>
    </div>
  );
}
