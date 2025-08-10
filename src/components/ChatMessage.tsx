// src/components/ChatMessage.tsx - Fixed version

'use client';

import React, {  useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/lib/types';
import { getThemeClasses, Theme } from '@/lib/theme';
import { SafeImage } from '@/components/ui/SafeImage';
import { User, ThumbsUp, ThumbsDown, Clipboard } from 'lucide-react';

interface FileData {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface MessageWithFiles extends Message {
  files?: FileData[];
}

interface ChatMessageProps {
  message: Message;
  theme: Theme;
  onFeedback?: (message: Message, feedback: 'helpful' | 'not-helpful') => void;
}

export function ChatMessage({ message, theme, onFeedback }: ChatMessageProps) {
  const themeClasses = getThemeClasses(theme);
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  
  // Helper function to format file sizes properly
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
  };

  // Copy handler
   const copyToClipboard = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };


  // Enhanced file rendering
  const renderFiles = () => {
    if (!message.files || message.files.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">📎 Attached Files</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">({message.files.length})</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {message.files.map((file, index) => {
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type.includes('pdf');
            const isWord = file.type.includes('word') || file.type.includes('document');
            const isText = file.type.includes('text') || file.type.includes('txt');

            return (
              <div key={index} className={`
                rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md
                ${isImage ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-700' :
                  isPdf ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-700' :
                  isWord ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-700' :
                  isText ? 'border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-700' :
                  'border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600'
                }
              `}>
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                    isImage ? 'bg-blue-100 dark:bg-blue-800' :
                    isPdf ? 'bg-red-100 dark:bg-red-800' :
                    isWord ? 'bg-green-100 dark:bg-green-800' :
                    isText ? 'bg-purple-100 dark:bg-purple-800' :
                    'bg-gray-100 dark:bg-gray-600'
                  }`}>
                    {isImage ? (
                      <span className="text-xl">🖼️</span>
                    ) : isPdf ? (
                      <span className="text-xl">📄</span>
                    ) : isWord ? (
                      <span className="text-xl">📝</span>
                    ) : isText ? (
                      <span className="text-xl">📄</span>
                    ) : (
                      <span className="text-xl">📎</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm truncate ${
                          isImage ? 'text-blue-900 dark:text-blue-100' :
                          isPdf ? 'text-red-900 dark:text-red-100' :
                          isWord ? 'text-green-900 dark:text-green-100' :
                          isText ? 'text-purple-900 dark:text-purple-100' :
                          'text-gray-900 dark:text-gray-100'
                        }`}>
                          {file.name}
                        </h4>
                        <p className={`text-xs mt-1 ${
                          isImage ? 'text-blue-700 dark:text-blue-300' :
                          isPdf ? 'text-red-700 dark:text-red-300' :
                          isWord ? 'text-green-700 dark:text-green-300' :
                          isText ? 'text-purple-700 dark:text-purple-300' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Image Preview */}
                    {isImage && (
                      <div className="mt-3">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-32 object-cover rounded-lg border-2 border-white dark:border-gray-600 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Download Link */}
                    <div className="mt-3">
                      <a
                        href={file.url}
                        download={file.name}
                        className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                          isImage ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-200' :
                          isPdf ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-800 dark:hover:bg-red-700 dark:text-red-200' :
                          isWord ? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-200' :
                          isText ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-800 dark:hover:bg-purple-700 dark:text-purple-200' :
                          'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                        }`}
                      >
                        <span>⬇️</span>
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Clean content rendering without file artifacts
  const renderCleanContent = () => {
    let cleanContent = message.content;
    
    // Remove file indicators from user messages (📎 File.pdf patterns)
    if (!isAssistant) {
      cleanContent = cleanContent.replace(/📎\s+[^\n]+/g, '').trim();
      // If content is empty after removing file indicators, show a default message
      const messageWithFiles = message as MessageWithFiles;
      if (!cleanContent && messageWithFiles.files && messageWithFiles.files.length > 0) {
        return null; // Don't show empty content, just show files
      }
    }
    
    // Remove file markdown links [file:name](url) patterns
    cleanContent = cleanContent.replace(/\[file:(.*?)\]\((.*?)\)/g, '');
    
    if (!cleanContent.trim()) return null;

    if (isAssistant) {
      return (
        <div className={`prose prose-sm max-w-none ${
          theme === 'dark' || theme === 'very-dark' 
            ? 'prose-invert prose-headings:text-white prose-p:text-gray-200 prose-strong:text-white prose-li:text-gray-200' 
            : 'prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700'
        }`}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 pl-4 space-y-1 list-disc">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 pl-4 space-y-1 list-decimal">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              code: ({ children }) => (
                <code className={`
                  px-1.5 py-0.5 rounded text-sm font-mono
                  ${theme === 'dark' || theme === 'very-dark' 
                    ? 'bg-gray-700 text-gray-200' 
                    : 'bg-gray-100 text-gray-800'
                  }
                `}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className={`
                  p-3 rounded-lg text-sm font-mono overflow-x-auto mb-3
                  ${theme === 'dark' || theme === 'very-dark' 
                    ? 'bg-gray-800 text-gray-200' 
                    : 'bg-gray-50 text-gray-800'
                  }
                `}>
                  {children}
                </pre>
              ),
            }}
          >
            {cleanContent}
          </ReactMarkdown>
        </div>
      );
    } else {
      // For user messages, render as plain text
      return <span>{cleanContent}</span>;
    }
  };

  const messageWithFiles = message as MessageWithFiles;
  const hasFiles = messageWithFiles.files && messageWithFiles.files.length > 0;
  const hasContent = renderCleanContent();

  return (
    <div className={`flex gap-4 mb-8 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <SafeImage
          src="/vb.png"
          alt="VB Logo"
          className="w-10 h-8 rounded-full flex-shrink-0"
          fallback={<div className="w-10 h-8 bg-gray-200 rounded-full" />}
        />
      )}

      <div
        className={`max-w-[85%] ${
          isAssistant
            ? `${themeClasses.bgSecondary} ${themeClasses.border}`
            : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
        } rounded-2xl px-5 py-4 shadow-lg border`}
      >
        {/* Files first for user messages */}
        {!isAssistant && hasFiles && (
          <div className="mb-4">
            {renderFiles()}
          </div>
        )}
        
        {/* Message content */}
        {hasContent && (
          <div className={`text-sm leading-relaxed ${isAssistant ? themeClasses.textSecondary : 'text-white'} ${hasFiles && !isAssistant ? 'mt-0' : ''}`}>
            {hasContent}
          </div>
        )}

        {/* Files after content for assistant messages */}
        {isAssistant && hasFiles && (
          <div className="mt-4">
            {renderFiles()}
          </div>
        )}

        {/* Footer: timestamp above, then thumbs left / copy right */}
        {isAssistant && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Timestamp */}
            {message.timestamp && (
              <div className={`text-xs ${themeClasses.textMuted} mb-2`}>
                {message.timestamp}
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between">
              {/* Thumbs up/down on left */}
              <div className="flex items-center gap-1">
                {onFeedback && (
                  <>
                    <button
                      onClick={() => onFeedback(message, 'helpful')}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${themeClasses.hoverSecondary} hover:bg-green-100 dark:hover:bg-green-900/20`}
                      aria-label="Mark as helpful"
                    >
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                    </button>
                    <button
                      onClick={() => onFeedback(message, 'not-helpful')}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${themeClasses.hoverSecondary} hover:bg-red-100 dark:hover:bg-red-900/20`}
                      aria-label="Mark as not helpful"
                    >
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${themeClasses.hoverSecondary} hover:bg-blue-100 dark:hover:bg-blue-900/20`}
                aria-label={copied ? "Copied!" : "Copy response"}
              >
                {copied ? (
                  <span className="text-xs text-green-600 font-medium">Copied!</span>
                ) : (
                  <Clipboard className="w-4 h-4 text-blue-600" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}