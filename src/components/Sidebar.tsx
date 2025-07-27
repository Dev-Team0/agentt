// components/Sidebar.tsx


'use client';
import { useState, useEffect } from 'react';
import { X, MessageSquare, Settings, Trash2 } from 'lucide-react';
import { getThemeClasses } from '@/lib/theme';
import { SafeImage } from '@/components/ui/SafeImage';
import type { Conversation, Theme } from '@/lib/types';
import React from 'react';


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  currentConversationId: string | null;
  onShowSettings: () => void;
  theme: Theme;
}


export function Sidebar({
  isOpen,
  onClose,
  conversations,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  currentConversationId,
  onShowSettings,
  theme,
}: SidebarProps) {
  const themeClasses = getThemeClasses(theme);
  const [isMounted, setIsMounted] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; conv: Conversation | null }>({
    show: false,
    conv: null
  });


  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleDeleteClick = (conv: Conversation) => {
    setDeleteModal({ show: true, conv });
  };


  const confirmDelete = () => {
    if (deleteModal.conv) {
      onDeleteConversation(deleteModal.conv.id);
      setDeleteModal({ show: false, conv: null });
    }
  };


  const cancelDelete = () => {
    setDeleteModal({ show: false, conv: null });
  };


  if (!isMounted) return null;


  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r ${themeClasses.bgSecondary} ${themeClasses.border}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-4 border-b ${themeClasses.border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <SafeImage src="/vb.png" alt="VB Logo" className="w-9 h-7 rounded-full" />
              <div>
                <h2 className={`font-semibold ${themeClasses.text}`}>VB Capital AI</h2>
                <p className={`text-xs ${themeClasses.textMuted}`}>Virtual Assistant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${themeClasses.hoverSecondary}`}
              aria-label="Close sidebar"
            >
              <X className={`w-5 h-5 ${themeClasses.textMuted}`} />
            </button>
          </div>


          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={() => {
                onNewConversation();
                onClose();
              }}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="w-4 h-4" />
              New Conversation
            </button>
          </div>


          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-4">
            {conversations.length > 0 ? (
              <>
                <h3 className={`text-sm font-medium mb-3 ${themeClasses.textMuted}`}>
                  Recent Conversations
                </h3>
                <div className="space-y-2">
                  {conversations.map((conv) => {
                    const isActive = currentConversationId === conv.id;


                    return (
                      <div
                        key={conv.id}
                        className={`
                          group flex items-center justify-between p-3 rounded-lg transition-colors
                          ${
                            isActive
                              ? 'bg-emerald-100 border border-emerald-600'
                              : themeClasses.hover
                          }
                        `}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            onSelectConversation(conv.id);
                            onClose();
                          }}
                        >
                          {/* Title: darker when active */}
                          <div
                            className={`
                              font-medium text-sm truncate
                              ${isActive ? 'text-emerald-900' : themeClasses.textSecondary}
                            `}
                          >
                            {conv.title}
                          </div>


                          {/* Timestamp: darker when active */}
                          <div
                            className={`
                              text-xs mt-1
                              ${isActive ? 'text-emerald-700' : themeClasses.textMuted}
                            `}
                          >
                            {conv.time}
                          </div>
                        </div>


                        <button
                          onClick={() => handleDeleteClick(conv)}
                          className="ml-2 opacity-30 group-hover:opacity-100 text-gray-500 hover:text-red-700 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className={`text-center py-8 ${themeClasses.textMuted}`}>
                No conversations yet
              </div>
            )}
          </div>


          {/* Settings */}
          <div className={`p-4 border-t ${themeClasses.border}`}>
            <button
              onClick={() => {
                onShowSettings();
                onClose();
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${themeClasses.textMuted} ${themeClasses.hoverSecondary}`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </div>


      {/* Simple Delete Modal */}
      {deleteModal.show && deleteModal.conv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className={`rounded-lg shadow-lg max-w-sm w-full p-6 ${themeClasses.cardBg}`}>
            <h3 className={`text-lg font-medium mb-3 ${themeClasses.text}`}>
              Delete conversation?
            </h3>
            <p className={`text-sm mb-6 ${themeClasses.textSecondary}`}>
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className={`flex-1 px-4 py-2 rounded-lg border text-black ${themeClasses.buttonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

