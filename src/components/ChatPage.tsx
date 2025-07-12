'use client';


import { useState, useRef, useEffect } from 'react';
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
import React from 'react';


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
    const saved = localStorage.getItem('vb-theme') as Theme;
    if (saved && ['light', 'dark', 'very-dark'].includes(saved)) {
      setTheme(saved);
    }
  }, []);
  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    localStorage.setItem('vb-theme', t);
  };


  // Auth check
  useEffect(() => {
    const check = async () => {
      setIsAuthChecking(true);
      try {
        const r = await fetch('/api/auth-check');
        if (r.status === 401) {
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
    check();
  }, [router]);


  // Admin flag
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/check-admin');
        const d = await r.json();
        setIsAdmin(d.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    };
    check();
  }, []);


  // Logout sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth' && e.newValue === 'false') router.push('/');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router]);


  // Load conversations
  useEffect(() => {
    if (isAuthChecking) return;
    (async () => {
      const r = await fetch('/api/conversations');
      if (r.ok) {
        const data: Conversation[] = await r.json();
        setConversations(data);
        if (data.length) {
          setCurrentConversationId(data[0].id);
          setMessages(data[0].messages);
        }
      }
    })();
  }, [isAuthChecking]);


  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // Autofocus
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [messages, isLoading]);


  const genTitle = (text: string) => {
    const w = text.split(' ').slice(0, 4).join(' ');
    return w.length > 30 ? w.slice(0, 30) + '…' : w;
  };


  const createConversation = () => {
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
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setMessages(conv.messages);
      setSidebarOpen(false);
    }
  };


  const updateConvMsgs = (id: string, msgs: Message[]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, messages: msgs, time: 'Just now' } : c
      )
    );
  };


  const sendFeedback = (msg: Message, fb: 'helpful' | 'not-helpful') =>
    console.log(`Feedback: ${fb}`, msg);


  // *** sendMessage ***
  const sendMessage = async (messageText?: string, file?: File): Promise<void> => {
    const text = messageText ?? input;
    if (!text.trim() && !file) return;


    // user message
    let userMessage: Message = {
      role: 'user',
      content: file
        ? `📎 Uploaded file: ${file.name}${text ? `\n\n${text}` : ''}`
        : text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };


    // upload file if needed
    if (file) {
      const data = new FormData();
      data.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: data });
      const { url } = await up.json();
      userMessage.content = `[file:${file.name}](${url})${text ? `\n\n${text}` : ''}`;
    }


    const newMsgs = [...messages, userMessage];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);


    let aiMessage: Message;
    try {
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_VB_API_KEY}`,
        },
        body: JSON.stringify({ messages: newMsgs }),
      });


      // parse JSON once
      const result = await chatResponse.json();


      if (!chatResponse.ok) {
        // throw with whatever error field your API returns
        throw new Error(result.error || result.message || 'Chat API failed');
      }


      aiMessage = {
        role: 'assistant',
        content: result.content,
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


    const finalMsgs = [...newMsgs, aiMessage];
    setMessages(finalMsgs);


    // save conversation
    const title = genTitle(text);
    try {
      if (currentConversationId) {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentConversationId, title, messages: finalMsgs }),
        });
        updateConvMsgs(currentConversationId, finalMsgs);
      } else {
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, messages: finalMsgs }),
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


  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    localStorage.setItem('auth', 'false');
    window.dispatchEvent(new Event('storage'));
    router.push('/');
  };


  const deleteConversation = async (id: string) => {
    const r = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (r.ok) {
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
    <div className={`h-screen flex ${themeClasses.bg}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        onNewConversation={createConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
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
{/* Header section */}
<header className={`border-b px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm ${themeClasses.cardBg} ${themeClasses.border}`}>
  <div className="flex items-center gap-3 min-w-0">
    <button
      onClick={() => setSidebarOpen(true)}
      className={`p-2 rounded-lg transition-colors ${themeClasses.hoverSecondary} ${themeClasses.focus}`}
      aria-label="Open menu"
    >
      <Menu className={`w-5 h-5 ${themeClasses.textMuted}`} />
    </button>
   
    <div className="flex items-center gap-2 min-w-0">
      <SafeImage
        src="/vb.png"
        alt="VB Capital"
        className="w-7 h-5 sm:w-9 sm:h-7 flex-shrink-0"
        theme={theme}
        fallback={<Building2 className={`w-5 h-5 ${themeClasses.textMuted}`} />}
      />
      <div className="min-w-0">
        <h1 className={`font-semibold text-sm sm:text-base truncate ${themeClasses.text}`}>
          VB Capital Assistant
        </h1>
        <div className="text-xs text-green-600 flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
          <span className="truncate">Online</span>
        </div>
      </div>
    </div>
  </div>


  <div className="flex items-center gap-2 flex-shrink-0">
    {isAdmin && (
      <button
        onClick={() => router.push('/admin')}
        className={`text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors ${themeClasses.buttonSecondary} ${themeClasses.text} whitespace-nowrap`}
      >
        Admin
      </button>
    )}
    <button
      onClick={handleLogout}
      className="p-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex items-center gap-1 transition-colors shadow"
      aria-label="Logout"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline whitespace-nowrap">Logout</span>
    </button>
  </div>
</header>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-0">
          <div className="max-w-4xl mx-auto">
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} theme={theme} onFeedback={m.role === 'assistant' ? sendFeedback : undefined} />
            ))}
            {isLoading && <TypingIndicator theme={theme} />}
            <div ref={messagesEndRef} />
          </div>
        </div>


        {/* Input */}
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
                    w-full p-4 pr-12 border rounded-2xl resize-none focus:outline-none transition-colors text-sm sm:text-base
                    ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.text} ${themeClasses.inputFocus}
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
                  placeholder="Type your message… (Press Enter to send)"
                  rows={1}
                  style={{ minHeight: '56px', maxHeight: '120px' }}
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
                <label htmlFor="fileUpload" title="Upload file" className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer text-emerald-500 hover:text-emerald-600 transition-colors">
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





