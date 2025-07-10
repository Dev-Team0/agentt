export type Theme = 'light' | 'dark' | 'very-dark';

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
  focus: string;
  active: string;
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
  cardBg: string;
  buttonPrimary: string;
  buttonSecondary: string;
}

export const getThemeClasses = (theme: Theme): ThemeClasses => {
  switch (theme) {
    case 'very-dark':
      return {
        bg: 'bg-black',
        bgSecondary: 'bg-gray-950',
        bgTertiary: 'bg-gray-900',
        border: 'border-gray-800',
        text: 'text-gray-100',
        textSecondary: 'text-gray-300',
        textMuted: 'text-gray-500',
        hover: 'hover:bg-gray-900',
        hoverSecondary: 'hover:bg-gray-800',
        focus: 'focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500',
        active: 'active:bg-gray-800',
        inputBg: 'bg-gray-900',
        inputBorder: 'border-gray-700',
        inputFocus: 'focus:border-emerald-500 focus:ring-emerald-500',
        cardBg: 'bg-gray-950',
        buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700',
        buttonSecondary: 'bg-gray-800 hover:bg-gray-700'
      };
    case 'dark':
      return {
        bg: 'bg-gray-900',
        bgSecondary: 'bg-gray-800',
        bgTertiary: 'bg-gray-700',
        border: 'border-gray-600',
        text: 'text-white',
        textSecondary: 'text-gray-200',
        textMuted: 'text-gray-400',
        hover: 'hover:bg-gray-700',
        hoverSecondary: 'hover:bg-gray-600',
        focus: 'focus:bg-gray-700 focus:ring-2 focus:ring-emerald-500',
        active: 'active:bg-gray-600',
        inputBg: 'bg-gray-800',
        inputBorder: 'border-gray-600',
        inputFocus: 'focus:border-emerald-500 focus:ring-emerald-500',
        cardBg: 'bg-gray-800',
        buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700',
        buttonSecondary: 'bg-gray-700 hover:bg-gray-600'
      };
    default: // light
      return {
        bg: 'bg-gray-50',
        bgSecondary: 'bg-white',
        bgTertiary: 'bg-gray-100',
        border: 'border-gray-200',
        text: 'text-gray-900',
        textSecondary: 'text-gray-700',
        textMuted: 'text-gray-500',
        hover: 'hover:bg-gray-100',
        hoverSecondary: 'hover:bg-gray-200',
        focus: 'focus:bg-white focus:ring-2 focus:ring-emerald-500',
        active: 'active:bg-gray-200',
        inputBg: 'bg-white',
        inputBorder: 'border-gray-300',
        inputFocus: 'focus:border-emerald-500 focus:ring-emerald-500',
        cardBg: 'bg-white',
        buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700',
        buttonSecondary: 'bg-gray-200 hover:bg-gray-300'
      };
  }
};