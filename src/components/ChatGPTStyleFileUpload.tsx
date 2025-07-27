// components/ChatGPTStyleFileUpload.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Paperclip, X, File, Image, FileText, Upload } from 'lucide-react';
import { Theme } from '@/lib/types';
import { getThemeClasses } from '@/lib/theme';

interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  error?: string;
}

interface ChatGPTStyleFileUploadProps {
  theme: Theme;
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  uploadedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  className?: string;
}

export const ChatGPTStyleFileUpload: React.FC<ChatGPTStyleFileUploadProps> = ({ 
  theme, 
  onFilesSelected, 
  disabled = false,
  uploadedFiles = [],
  onRemoveFile,
  className = ""
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeClasses = getThemeClasses(theme);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large (max 10MB)' };
    }
    return { valid: true };
  };

  const processFiles = async (files: File[]) => {
    const validFiles: File[] = [];
    
    for (const file of files) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      }
    }
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [disabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  return (
    <>
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className={`rounded-2xl p-8 shadow-2xl border max-w-sm mx-4 ${themeClasses.cardBg} ${themeClasses.border}`}>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${themeClasses.text}`}>
                Drop files to upload
              </h3>
              <p className={`text-sm ${themeClasses.textMuted}`}>
                Support for images, documents, and more
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Previews - Improved UI */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className={`
                relative group rounded-xl border p-3 flex items-center gap-3 transition-all
                ${themeClasses.cardBg} ${themeClasses.border} hover:shadow-md
              `}
            >
              {/* File Icon/Preview */}
              <div className="flex-shrink-0">
                {file.type.startsWith('image/') ? (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Image className="w-5 h-5 text-blue-500" />
                  </div>
                ) : file.type.includes('pdf') ? (
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                    <File className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${themeClasses.text}`}>
                  {file.name}
                </p>
                <p className={`text-sm ${themeClasses.textMuted}`}>
                  {formatFileSize(file.size)}
                </p>
              </div>

              {/* Remove Button */}
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 hover:text-red-600"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {/* Paperclip Button - for inline use */}
      {className.includes('inline') ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={`
            absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg transition-colors
            ${disabled 
              ? 'text-gray-300 cursor-not-allowed' 
              : `${themeClasses.textMuted} hover:${themeClasses.text} hover:bg-gray-100 dark:hover:bg-gray-700`
            }
          `}
          title="Attach files"
          onDragOver={handleDragOver}
        >
          <Paperclip className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={`
            p-2 rounded-lg transition-colors ${className}
            ${disabled 
              ? 'text-gray-300 cursor-not-allowed' 
              : `${themeClasses.textMuted} hover:${themeClasses.text} hover:bg-gray-100 dark:hover:bg-gray-800`
            }
          `}
          title="Attach files"
          onDragOver={handleDragOver}
        >
          <Paperclip className="w-5 h-5" />
        </button>
      )}
    </>
  );
};