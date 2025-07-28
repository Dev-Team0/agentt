'use client';

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Menu, Building2, LogOut } from 'lucide-react';
import { Conversation, Message, Theme } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';
import { getThemeClasses } from '@/lib/theme';
import { Sidebar } from './Sidebar';
import { SettingsModal } from './SettingsModal';
import { QuestionSuggestions } from './QuestionSuggestions';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatGPTStyleFileUpload } from '@/components/ChatGPTStyleFileUpload';

interface FileData {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface MessageWithFiles extends Message {
  files?: FileData[];
}

interface ChatResponse {
  content: string;
  filesProcessed?: number;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const themeClasses = getThemeClasses(theme);

  // Helper function to format file sizes properly
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
   
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
   
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
  };

  // Load theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vb-theme') as Theme;
    if (saved && ['light', 'dark', 'very-dark'].includes(saved)) {
      setTheme(saved);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('vb-theme', newTheme);
  };

  // Authentication check
  useEffect(() => {
    (async () => {
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
    })();
  }, [router]);

  // Admin role check
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/check-admin');
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  // Listen for auth storage change
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth' && e.newValue === 'false') {
        router.push('/');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router]);

  // Load conversations
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          if (data.length > 0) {
            setCurrentConversationId(data[0].id);
            setMessages(data[0].messages || []);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    })();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus textarea
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const generateConversationTitle = (text: string) => {
    const words = text.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  const createNewConversation = () => {
    setCurrentConversationId(null);
    setUploadedFiles([]);
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
      setUploadedFiles([]);
      setSidebarOpen(false);
    }
  };

  const updateConversationMessages = (id: string, newMsgs: Message[]) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, messages: newMsgs, time: 'Just now' } : conv))
    );
  };

  const sendFeedback = (msg: Message, fb: 'helpful' | 'not-helpful') => {
    console.log(`Feedback: ${fb} for message:`, msg);
  };

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };

  // Handle paste events for files
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (isLoading) return;

    const clipboardData = e.clipboardData;
    const items = Array.from(clipboardData.items);
   
    // Check if there are files in the clipboard
    const fileItems = items.filter(item => item.kind === 'file');
   
    if (fileItems.length > 0) {
      e.preventDefault(); // Prevent default paste behavior for files
     
      const files: File[] = [];
     
      for (const item of fileItems) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
     
      if (files.length > 0) {
        console.log(`Pasted ${files.length} file(s):`, files.map(f => f.name));
        handleFilesSelected(files);
       
        // Optional: Show a brief notification
        const notification = document.createElement('div');
        notification.textContent = `${files.length} file(s) pasted successfully!`;
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
        document.body.appendChild(notification);
       
        setTimeout(() => {
          notification.style.opacity = '0';
          setTimeout(() => document.body.removeChild(notification), 300);
        }, 2000);
      }
    }
    // If no files, let the default paste behavior handle text
  };

  // Updated sendMessage function with file content extraction
  const sendMessage = async (messageText?: string): Promise<void> => {
    const text = messageText ?? input;
    const filesToSend = [...uploadedFiles];
   
    if (!text.trim() && filesToSend.length === 0) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const uploadedFileData: FileData[] = [];

    // Step 1: Upload files if any
    if (filesToSend.length > 0) {
      try {
        console.log(`Uploading ${filesToSend.length} files...`);
       
        for (const file of filesToSend) {
          console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
         
          const fd = new FormData();
          fd.append('file', file);
         
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: fd
          });
         
          console.log(`Upload response status: ${res.status} ${res.statusText}`);
         
          if (!res.ok) {
            let errorMessage = `Failed to upload ${file.name} (${res.status} ${res.statusText})`;
            try {
              const errorData: ApiErrorResponse = await res.json();
              console.error('Upload error details:', errorData);
              errorMessage = `Upload failed: ${errorData.error || errorMessage}`;
            } catch (parseError) {
              console.error('Could not parse error response:', parseError);
            }
            throw new Error(errorMessage);
          }
         
          const uploadResult = await res.json();
          console.log(`Successfully uploaded: ${file.name} -> ${uploadResult.url}`);
         
          uploadedFileData.push({
            name: file.name,
            url: uploadResult.url,
            type: file.type,
            size: file.size
          });
        }

        console.log(`Successfully uploaded ${uploadedFileData.length} files`);

        // Update user message to show file attachments
        if (!text.trim()) {
          if (uploadedFileData.length === 1) {
            userMessage.content = `📎 ${uploadedFileData[0].name}`;
          } else {
            userMessage.content = `📎 ${uploadedFileData.length} files attached`;
          }
        } else {
          userMessage.content = `${text}\n\n📎 Files: ${uploadedFileData.map(f => f.name).join(', ')}`;
        }

        // Store file data in message for UI display
        (userMessage as MessageWithFiles).files = uploadedFileData;

      } catch (err: unknown) {
        console.error('File upload error details:', err);
       
        // Show more helpful error message to user
        let userErrorMessage = 'File upload failed. ';
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
       
        if (errorMessage.includes('413')) {
          userErrorMessage += 'File is too large. Please try a smaller file.';
        } else if (errorMessage.includes('415')) {
          userErrorMessage += 'File type not supported. Please try PDF, Word, or image files.';
        } else if (errorMessage.includes('401')) {
          userErrorMessage += 'Please log in again and try uploading.';
        } else {
          userErrorMessage += errorMessage;
        }
       
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `❌ ${userErrorMessage}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }
    }

    // Step 2: Add user message to chat
    const newMsgs = [...messages, userMessage];
    setMessages(newMsgs);
    setInput('');
    setUploadedFiles([]);
    setIsLoading(true);

    const title = generateConversationTitle(text || uploadedFileData.map(f => f.name).join(', '));
    let finalMsgs = [...newMsgs];

    try {
      console.log('Sending message to AI with files:', uploadedFileData.length);

      // Step 3: Send to chat API (which will handle file content extraction)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NEXT_PUBLIC_VB_API_KEY ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_VB_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          messages: newMsgs.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          files: uploadedFileData // Send file metadata to chat API
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to get AI response';
        try {
          const errorData: ApiErrorResponse = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Error parsing response, use default message
        }
        throw new Error(errorMessage);
      }

      const data: ChatResponse = await res.json();
     
      if (!data.content) {
        throw new Error('No content received from AI');
      }

      console.log(`AI response received. Files processed: ${data.filesProcessed || 0}`);

      // Step 4: Add AI response to chat
      const aiMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      finalMsgs = [...newMsgs, aiMessage];
      setMessages(finalMsgs);

    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      const errorMsg: Message = {
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${errorMessage}. Please try again or contact support if the issue persists.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      finalMsgs = [...newMsgs, errorMsg];
      setMessages(finalMsgs);
    }

    // Step 5: Save conversation
    try {
      if (currentConversationId) {
        await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentConversationId, title, messages: finalMsgs }),
        });
        updateConversationMessages(currentConversationId, finalMsgs);
      } else {
        const r = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, messages: finalMsgs }),
        });
        const rd = await r.json();
        if (rd.id) setCurrentConversationId(rd.id);
        const updated = await fetch('/api/conversations');
        if (updated.ok) setConversations(await updated.json());
      }
    } catch (e) {
      console.error('Failed to save conversation:', e);
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
    } catch (err) {
      console.error('Failed to delete conversation:', err);
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
                <h1 className={`font-semibold text-sm sm:text-base truncate ${themeClasses.text}`}>VB Capital Assistant</h1>
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
                className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors ${themeClasses.buttonSecondary} ${themeClasses.text}`}>
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
              <ChatMessage key={i} message={msg} theme={theme} onFeedback={msg.role === 'assistant' ? sendFeedback : undefined} />
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
                <QuestionSuggestions onSelectQuestion={sendMessage} conversations={conversations} theme={theme} />
              </div>
            )}
           
            {/* File previews above textarea */}
            {uploadedFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg ${themeClasses.cardBg} ${themeClasses.border}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {file.type.startsWith('image/') ? (
                          <span className="text-lg">🖼️</span>
                        ) : file.type === 'application/pdf' ? (
                          <span className="text-lg">📄</span>
                        ) : file.type.includes('word') ? (
                          <span className="text-lg">📝</span>
                        ) : (
                          <span className="text-lg">📎</span>
                        )}
                      </div>
                      <div>
                        <div className={`font-medium text-sm ${themeClasses.text}`}>{file.name}</div>
                        <div className={`text-xs ${themeClasses.textMuted}`}>
                          {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
           
            <div className="flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  className={`
                    w-full p-4 pr-16 border-1 rounded-2xl resize-none focus:outline-none transition-colors text-sm sm:text-base
                    min-h-[56px] max-h-[160px] overflow-hidden sm:overflow-y-auto
                    ${themeClasses.inputBg} ${themeClasses.text} focus:border-green-400 focus:ring-2 focus:ring-green-200
                    placeholder-gray-500
                  `}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  onPaste={handlePaste}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isLoading) {
                      const files = Array.from(e.dataTransfer.files);
                      handleFilesSelected(files);
                    }
                  }}
                  placeholder={uploadedFiles.length > 0 ? "Ask about your files or add more context..." : "Type your message..."}
                  disabled={isLoading}
                />
               
                {/* File upload component inside textarea - positioned on the right */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <ChatGPTStyleFileUpload
                    theme={theme}
                    onFilesSelected={handleFilesSelected}
                    disabled={isLoading}
                    uploadedFiles={[]}
                    onRemoveFile={removeFile}
                  />
                </div>
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center min-w-[48px] sm:min-w-[56px]"
                title={isLoading ? "Processing..." : "Send message"}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            <p className={`text-xs mt-2 text-center ${themeClasses.textMuted} px-2`}>
              Upload PDFs, Word docs, images, or text files for AI analysis. 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}