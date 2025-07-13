// components/QuestionSuggestions.tsx
'use client';
import React from 'react';
import { Conversation, Theme } from '../lib/types';
import { getThemeClasses } from '../lib/theme';


interface QuestionSuggestionsProps {
  onSelectQuestion: (question: string) => void;
  conversations: Conversation[];
  theme: Theme;
}


export function QuestionSuggestions({ onSelectQuestion, conversations, theme }: QuestionSuggestionsProps) {
  const themeClasses = getThemeClasses(theme);
 
  const getPopularQuestions = () => {
    const allUserMessages = conversations.flatMap(conv =>
      conv.messages.filter(msg => msg.role === 'user')
    );
   
    if (allUserMessages.length > 0) {
      const recentQuestions = allUserMessages
        .slice(-6)
        .map(msg => msg.content)
        .filter(content => content.length > 10);
     
      if (recentQuestions.length >= 3) {
        return recentQuestions.slice(0, 3);
      }
    }
   
    return [
      "Draft an email for me",
      "What is the objective for this week based on monthly schedule?",
      "What can you do?"
    ];
  };


  const suggestions = getPopularQuestions();


  return (
    <div className="mb-4">
      <h3 className={`text-sm font-medium mb-3 ${themeClasses.textMuted}`}>
        {conversations.length > 0 ? 'Recent Questions' : 'Popular Questions'}
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectQuestion(suggestion)}
            className={`text-left p-3 border rounded-lg transition-all duration-200 text-sm ${themeClasses.bgSecondary} ${themeClasses.border} hover:bg-emerald-900 hover:border-emerald-600 ${themeClasses.textSecondary} hover:text-emerald-300`}
          >
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
              {suggestion}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

