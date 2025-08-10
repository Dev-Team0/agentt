'use client';

import React from 'react';
import { Theme } from '@/lib/types';
import { getThemeClasses } from '@/lib/theme';
import { SafeImage } from '@/components/ui/SafeImage';

export function TypingIndicator({ theme }: { theme: Theme }) {
  const themeClasses = getThemeClasses(theme);

  return (
    <div className="flex gap-4 mb-6">
      <div>
        <SafeImage
          src="/logo_b.svg"
          alt="VB Logo"
          className="w-9 h-7 rounded-full"
        />
      </div>
      <div
        className={`rounded-2xl px-4 py-3 shadow-sm border ${themeClasses.bgSecondary} ${themeClasses.border}`}
      >
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.1s' }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
    </div>
  );
}
