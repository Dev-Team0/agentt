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

// Type for grouped conversations
interface GroupedConversations {
  [key: string]: Conversation[];
}

// Helper function to safely parse dates
const parseDate = (timestamp: string | Date): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Try different date parsing approaches
  let date = new Date(timestamp);
  
  // If it's invalid, try common timestamp formats
  if (isNaN(date.getTime())) {
    // Try parsing as number (Unix timestamp)
    const numTimestamp = Number(timestamp);
    if (!isNaN(numTimestamp)) {
      // Check if it's in seconds or milliseconds
      date = numTimestamp > 1000000000000 
        ? new Date(numTimestamp) // milliseconds
        : new Date(numTimestamp * 1000); // seconds
    }
  }
  
  // If still invalid, return current date as fallback
  if (isNaN(date.getTime())) {
    console.warn(`Invalid timestamp: ${timestamp}, using current date as fallback`);
    return new Date();
  }
  
  return date;
};

// Smart date formatting function
const formatConversationTime = (timestamp: string): { display: string; groupKey: string } => {
  const now = new Date();
  const conversationDate = parseDate(timestamp);
  
  // Calculate the difference in days
  const diffTime = now.getTime() - conversationDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Format time for display (HH:MM AM/PM)
  const timeString = conversationDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  if (diffDays === 0) {
    // Today - show time
    return {
      display: timeString,
      groupKey: 'Today'
    };
  } else if (diffDays === 1) {
    // Yesterday
    return {
      display: timeString,
      groupKey: 'Yesterday'
    };
  } else if (diffDays <= 7) {
    // Within a week - show day name
    const dayName = conversationDate.toLocaleDateString('en-US', { weekday: 'long' });
    return {
      display: timeString,
      groupKey: dayName
    };
  } else if (diffDays <= 30) {
    // Within a month - show "X days ago"
    return {
      display: timeString,
      groupKey: `${diffDays} days ago`
    };
  } else {
    // Older than a month - show date
    const dateString = conversationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: conversationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
    return {
      display: timeString,
      groupKey: dateString
    };
  }
};

// Function to group conversations by date
const groupConversationsByDate = (conversations: Conversation[]): GroupedConversations => {
  const grouped: GroupedConversations = {};
  
  conversations.forEach(conv => {
    const { groupKey } = formatConversationTime(conv.time);
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(conv);
  });
  
  return grouped;
};

// Function to get the order of groups (Today first, then Yesterday, etc.)
const getGroupOrder = (groupKey: string): number => {
  if (groupKey === 'Today') return 0;
  if (groupKey === 'Yesterday') return 1;
  if (groupKey.includes('days ago')) {
    const days = parseInt(groupKey.split(' ')[0]);
    return 100 + days; // Ensure these come after weekdays
  }
  // For weekdays, we'll put them after Yesterday but before "days ago"
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayIndex = weekdays.indexOf(groupKey);
  if (weekdayIndex !== -1) {
    return 10 + weekdayIndex;
  }
  // For month names or specific dates, put them last
  return 1000;
};

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

  // Group conversations by date
  const groupedConversations = groupConversationsByDate(conversations);
  const sortedGroupKeys = Object.keys(groupedConversations).sort(
    (a, b) => getGroupOrder(a) - getGroupOrder(b)
  );

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80  shadow-xl transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r ${themeClasses.bgSecondary} ${themeClasses.border}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-3.5 border-b ${themeClasses.border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <SafeImage src="/logo_b.svg" alt="VB Logo" className="w-9 h-7 rounded-full" />
              <div>
                <h2 className={`font-semibold ${themeClasses.text}`}>Willow</h2>
                <p className={`text-xs ${themeClasses.textMuted}`}>WeOrg Assistant</p>
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
              className="w-full bg-gradient-to-r from-[#1E06BE] to-[#2d0bcc] hover:from-[#2d0bcc] hover:to-[#3c0fd9] text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="w-4 h-4" />
              New Conversation
            </button>
          </div>

          {/* Extra spacing before Recent Conversations */}
          <div className="pt-8"></div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-4">
            {conversations.length > 0 ? (
              <>
                <h3 className={`text-sm font-medium mb-4 ${themeClasses.textMuted}`}>
                  Recent Conversations
                </h3>
                
                {/* Render grouped conversations */}
                {sortedGroupKeys.map(groupKey => (
                  <div key={groupKey} className="mb-6">
                    {/* Group header */}
                    <div className={`text-xs font-medium mb-2 px-2 ${themeClasses.textMuted} opacity-70`}>
                      {groupKey}
                    </div>
                    
                    {/* Conversations in this group */}
                    <div className="space-y-2">
                      {groupedConversations[groupKey].map((conv) => {
                        const isActive = currentConversationId === conv.id;
                        const { display: timeDisplay } = formatConversationTime(conv.time);

                        return (
                          <div
                            key={conv.id}
                            className={`
                              group flex items-center justify-between p-3 rounded-lg transition-colors
                              ${
                                isActive
                                  ? 'bg-[#DCDAF7] border border-[#1E06BE]'
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
                                  ${isActive ? 'text-[#1E06BE]' : themeClasses.textSecondary}
                                `}
                              >
                                {conv.title}
                              </div>

                              {/* Time: show formatted time */}
                              <div
                                className={`
                                  text-xs mt-1
                                  ${isActive ? 'text-[#1E06BE]/70' : themeClasses.textMuted}
                                `}
                              >
                                {timeDisplay}
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
                  </div>
                ))}
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