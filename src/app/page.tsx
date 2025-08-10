'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Building2, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Type definitions
type Theme = 'light' | 'dark' | 'very-dark';

interface ThemeClasses {
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

// Theme utilities
const getThemeClasses = (theme: Theme): ThemeClasses => {
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
      };
    case 'dark':
      return {
        bg: 'bg-gray-900',
        bgSecondary: 'bg-gray-800',
        bgTertiary: 'bg-gray-700',
        border: 'border-gray-700',
        text: 'text-white',
        textSecondary: 'text-gray-200',
        textMuted: 'text-gray-400',
        hover: 'hover:bg-gray-800',
        hoverSecondary: 'hover:bg-gray-700',
      };
    default:
      return {
        bg: 'bg-gray-50',
        bgSecondary: 'bg-white',
        bgTertiary: 'bg-gray-100',
        border: 'border-gray-200',
        text: 'text-gray-900',
        textSecondary: 'text-gray-700',
        textMuted: 'text-gray-500',
        hover: 'hover:bg-gray-50',
        hoverSecondary: 'hover:bg-gray-100',
      };
  }
};

// Safe image component with fallback
const SafeImage = ({
  src,
  alt,
  fallback,
  className,
  width = 128,
  height = 128,
}: {
  src: string;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
  width?: number;
  height?: number;
}) => {
  const [error, setError] = useState(false);

  if (error || !src || (!src.startsWith('/') && !src.startsWith('http'))) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setError(true)}
    />
  );
};
export default function SignInPage() {
  const [theme, setTheme] = useState<Theme>('light');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const userIdRef = useRef<HTMLInputElement>(null);
  const themeClasses = getThemeClasses(theme);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      userIdRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth-check');
        if (res.ok) {
          router.push('/chat');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId.trim() || !password.trim()) {
      setError('Please enter credentials');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      router.push('/chat');
    } catch {
      setError('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setShowThemeSelector(false);
  };

  return (
    <div className={`min-h-screen flex ${themeClasses.bg} transition-colors duration-300`}>
      {/* Theme Selector */}
      <div className="absolute top-6 right-6 z-10">
        <div className="relative">
          <button
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className={`p-3 rounded-lg transition-colors cursor-pointer ${themeClasses.bgSecondary} ${themeClasses.border} border ${themeClasses.hoverSecondary}`}
            title="Change Theme"
          >
            <Settings className={`w-5 h-5 ${themeClasses.textMuted}`} />
          </button>

          {showThemeSelector && (
            <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-xl border ${themeClasses.bgSecondary} ${themeClasses.border} py-2`}>
              {['light', 'dark', 'very-dark'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t as Theme)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                    theme === t
                      ? 'bg-emerald-500 text-white'
                      : `${themeClasses.textSecondary} ${themeClasses.hoverSecondary}`
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)} Theme
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left side branding */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <SafeImage
                src="/vb.png"
                alt="VB Capital"
                className="w-34 h-25 rounded-2xl shadow-2xl"
                fallback={
                  <div className="w-30 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-2xl flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-white" />
                  </div>
                }
              />
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
            </div>
          </div>
          <h1 className={`text-4xl font-bold mb-4 ${themeClasses.text}`}>Welcome to VB Capital</h1>
          <p className={`text-lg leading-relaxed ${themeClasses.textSecondary}`}>
            Your intelligent companion powered by advanced AI. Gain quick access to company information and insight.
          </p>
        </div>
      </div>

      {/* Right side sign-in */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <SafeImage
                src="/vb.png"
                alt="VB Capital"
                className="w-16 h-12 rounded-xl"
                fallback={
                  <div className="w-16 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                }
              />
            </div>
            <h1 className={`text-2xl font-bold ${themeClasses.text}`}>VB Capital</h1>
          </div>

          <div className={`rounded-2xl shadow-2xl border p-8 ${themeClasses.bgSecondary} ${themeClasses.border}`}>
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-bold mb-2 ${themeClasses.text}`}>Sign In</h2>
              <p className={`${themeClasses.textMuted}`}>Enter your credentials to access your account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>User ID</label>
                <input
                  ref={userIdRef}
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') handleSubmit(e);
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${themeClasses.bgTertiary} ${themeClasses.border} ${themeClasses.text} placeholder-gray-500`}
                  placeholder="Enter your User ID"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') handleSubmit(e);
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${themeClasses.bgTertiary} ${themeClasses.border} ${themeClasses.text} placeholder-gray-500`}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors cursor-pointer ${themeClasses.textMuted} ${themeClasses.hoverSecondary}`}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading || !userId.trim() || !password.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className={`text-xs ${themeClasses.textMuted}`}>Secure access to VB Capital AI Assistant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

