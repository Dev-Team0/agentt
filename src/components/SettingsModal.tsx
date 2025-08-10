// components/SettingsModal.tsx
'use client';
import React from 'react';
import { X } from 'lucide-react';
import { Theme } from '@/lib/theme';
import { getThemeClasses } from '@/lib/theme';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}


export function SettingsModal({ isOpen, onClose, theme, onThemeChange }: SettingsModalProps) {
  const themeClasses = getThemeClasses(theme);
 
  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.text}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${themeClasses.hoverSecondary}`}
          >
            <X className={`w-5 h-5 ${themeClasses.textMuted}`} />
          </button>
        </div>
       
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as Theme)}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${themeClasses.bgTertiary} ${themeClasses.border} ${themeClasses.text}`}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="very-dark">Very Dark</option>
            </select>
          </div>
         
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
              Auto-save conversations
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked disabled />
              <div className="w-11 h-6 bg-emerald-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all opacity-75"></div>
            </label>
          </div>
        </div>
       
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors cursor-pointer ${themeClasses.bgTertiary} ${themeClasses.textSecondary} ${themeClasses.hoverSecondary}`}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

