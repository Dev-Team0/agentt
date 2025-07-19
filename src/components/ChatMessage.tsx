// src/components/ChatMessage.tsx


'use client';


import React, { JSX } from 'react';
import { Message } from '@/lib/types';
import { getThemeClasses, Theme } from '@/lib/theme';
import { SafeImage } from '@/components/ui/SafeImage';
import { User, ThumbsUp, ThumbsDown, Clipboard } from 'lucide-react';
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


  const renderContent = (): (string | JSX.Element)[] => {
    const fileRegex = /\[file:(.*?)\]\((.*?)\)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;


    while ((match = fileRegex.exec(message.content)) !== null) {
      const fileName = match[1]?.trim();
      const fileUrl = match[2]?.trim();
      const start = match.index;
      const end = fileRegex.lastIndex;


      if (start > lastIndex) {
        parts.push(message.content.slice(lastIndex, start));
      }
      lastIndex = end;


      if (!fileName || !fileUrl) continue;


      const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(fileName);
      if (isImage && /^(https?:\/\/|\/)/.test(fileUrl)) {
        parts.push(
          <div key={`img-${fileUrl}`} className="mt-2">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={fileUrl}
                alt={fileName}
                width={300}
                height={200}
                className="max-w-xs rounded-lg border"
              />
            </a>
          </div>
        );
      } else if (!isImage) {
        parts.push(
          <div key={`file-${fileUrl}`} className="mt-2">
            <a href={fileUrl} download className="text-emerald-600 underline text-sm">
              📄 Download {fileName}
            </a>
          </div>
        );
      }
    }


    if (lastIndex < message.content.length) {
      parts.push(message.content.slice(lastIndex));
    }
    return parts;
  };


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
      {/* Message body */}
      <div className={`text-sm ${isAssistant ? themeClasses.textSecondary : 'text-white'}`}>
        {renderContent()}
      </div>


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





