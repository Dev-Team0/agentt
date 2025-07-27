// types.ts
export type Theme = 'light' | 'dark' | 'very-dark';


export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  files?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}


export interface Conversation {
  id: string;
  title: string;
  time: string;
  messages: Message[];
}


export interface ThemeClasses {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  hover: string;
  hoverSecondary: string;
}


export interface AIResponse {
  role: string;
  content: string;
  document?: {
    fileName: string;
    mimeType: string;
    data: string;
  };
}

