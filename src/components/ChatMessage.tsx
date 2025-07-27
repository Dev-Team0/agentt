// src/components/ChatMessage.tsx - Improved version

'use client';

import React, { JSX } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/lib/types';
import { getThemeClasses, Theme } from '@/lib/theme';
import { SafeImage } from '@/components/ui/SafeImage';
import { User, ThumbsUp, ThumbsDown, Clipboard, File, Image as ImageIcon, FileText, Download } from 'lucide-react';
import Image from 'next/image';

interface ChatMessageProps {
  message: Message;
  theme: Theme;
  onFeedback?: (message: Message, feedback: 'helpful' | 'not-helpful') => void;
}

export function ChatMessage({ message, theme, onFeedback }: ChatMessageProps) {
  const themeClasses = getThemeClasses(theme);
  const isAssistant = message.role === 'assistant';

  // Copy handler
  const copyToClipboard = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(message.content);
    }
  };

  // Enhanced file rendering
  const renderFiles = () => {
    const files = (message as any).files;
    if (!files || files.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {files.map((file: any, index: number) => {
          const isImage = file.type.startsWith('image/');
          const isPdf = file.type === 'application/pdf';
          const isDoc = file.type.includes('document') || file.type.includes('word');
          
          return (
            <div key={index} className={`
              rounded-lg border p-3 ${themeClasses.cardBg} ${themeClasses.border}
            `}>
              <div className="flex items-start gap-3">
                {/* File Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {isImage ? (
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-blue-500" />
                    </div>
                  ) : isPdf ? (
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-red-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <File className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm truncate ${themeClasses.text}`}>
                    {file.name}
                  </h4>
                  <p className={`text-xs ${themeClasses.textMuted} mt-0.5`}>
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  
                  {/* Image Preview */}
                  {isImage && file.url && (
                    <div className="mt-2">
                      <Image
                        src={file.url}
                        alt={file.name}
                        width={200}
                        height={150}
                        className="rounded-lg border max-w-[200px] h-auto"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  
                  {/* Download Link for Non-Images */}
                  {!isImage && file.url && (
                    <a
                      href={file.url}
                      download={file.name}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
      if (!cleanContent && (message as any).files?.length > 0) {
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

  const hasFiles = (message as any).files?.length > 0;
  const hasContent = renderCleanContent();

  return (
    <div className={`flex gap-4 mb-6 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <SafeImage
          src="/vb.png"
          alt="VB Logo"
          className="w-9 h-7 rounded-full"
          fallback={<div className="w-9 h-7 bg-gray-200 rounded-full" />}
        />
      )}

      <div
        className={`max-w-[80%] ${
          isAssistant
            ? `${themeClasses.bgSecondary} ${themeClasses.border}`
            : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
        } rounded-2xl px-4 py-3 shadow-sm border`}
      >
        {/* Files first for user messages */}
        {!isAssistant && hasFiles && renderFiles()}
        
        {/* Message content */}
        {hasContent && (
          <div className={`text-sm ${isAssistant ? themeClasses.textSecondary : 'text-white'} ${hasFiles && !isAssistant ? 'mt-3' : ''}`}>
            {hasContent}
          </div>
        )}

        {/* Files after content for assistant messages */}
        {isAssistant && hasFiles && renderFiles()}

        {/* Footer: timestamp above, then thumbs left / copy right */}
        {isAssistant && (
          <div className="mt-2">
            {/* Timestamp */}
            {message.timestamp && (
              <div className={`text-xs ${themeClasses.textMuted}`}>
                {message.timestamp}
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between mt-1">
              {/* Thumbs up/down on left */}
              <div className="flex items-center gap-2">
                {onFeedback && (
                  <>
                    <button
                      onClick={() => onFeedback(message, 'helpful')}
                      className={`p-1 rounded ${themeClasses.hoverSecondary}`}
                      aria-label="Mark as helpful"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onFeedback(message, 'not-helpful')}
                      className={`p-1 rounded ${themeClasses.hoverSecondary}`}
                      aria-label="Mark as not helpful"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Copy button on right */}
              <button
                onClick={copyToClipboard}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Copy response"
              >
                <Clipboard className="w-4 h-4 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}