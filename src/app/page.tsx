"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Building2, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Type definitions
type Theme = "light" | "dark" | "very-dark";

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
        case "very-dark":
            return {
                bg: "bg-black",
                bgSecondary: "bg-gray-950",
                bgTertiary: "bg-gray-900",
                border: "border-gray-800",
                text: "text-gray-100",
                textSecondary: "text-gray-300",
                textMuted: "text-gray-500",
                hover: "hover:bg-gray-900",
                hoverSecondary: "hover:bg-gray-800",
            };
        case "dark":
            return {
                bg: "bg-gray-900",
                bgSecondary: "bg-gray-800",
                bgTertiary: "bg-gray-700",
                border: "border-gray-700",
                text: "text-white",
                textSecondary: "text-gray-200",
                textMuted: "text-gray-400",
                hover: "hover:bg-gray-800",
                hoverSecondary: "hover:bg-gray-700",
            };
        default:
            return {
                bg: "bg-white",
                bgSecondary: "bg-gray-50",
                bgTertiary: "bg-white",
                border: "border-gray-200",
                text: "text-gray-900",
                textSecondary: "text-gray-700",
                textMuted: "text-gray-500",
                hover: "hover:bg-gray-50",
                hoverSecondary: "hover:bg-gray-100",
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

    if (error || !src || (!src.startsWith("/") && !src.startsWith("http"))) {
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
    const [theme, setTheme] = useState<Theme>("light");
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
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
                const res = await fetch("/api/auth-check");
                if (res.ok) {
                    router.push("/chat");
                }
            } catch (err) {
                console.error("Auth check failed:", err);
            }
        };
        checkAuth();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId.trim() || !password.trim()) {
            setError("Please enter credentials");
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Invalid credentials");
                return;
            }

            router.push("/chat");
        } catch {
            setError("Authentication failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        setShowThemeSelector(false);
    };

    return (
        <div
            className={`min-h-screen flex ${themeClasses.bg} transition-colors duration-300`}
        >
            {/* Theme Selector */}
            <div className="absolute top-6 right-6 z-10">
                <div className="relative">
                    <button
                        onClick={() => setShowThemeSelector(!showThemeSelector)}
                        className={`p-3 rounded-xl transition-all duration-200 ${themeClasses.bgSecondary} ${themeClasses.border} border ${themeClasses.hoverSecondary} shadow-lg`}
                        title="Change Theme"
                    >
                        <Settings
                            className={`w-5 h-5 ${themeClasses.textMuted}`}
                        />
                    </button>

                    {showThemeSelector && (
                        <div
                            className={`absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border ${themeClasses.bgSecondary} ${themeClasses.border} py-2`}
                        >
                            {["light", "dark", "very-dark"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() =>
                                        handleThemeChange(t as Theme)
                                    }
                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                        theme === t
                                            ? "bg-blue-600 text-white"
                                            : `${themeClasses.textSecondary} ${themeClasses.hoverSecondary}`
                                    }`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}{" "}
                                    Theme
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Left side branding */}
            <div className="hidden lg:flex lg:flex-1 items-center justify-center p-12">
                <div className="max-w-lg text-center">
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <SafeImage
                                src="/logo_b.png"
                                alt="WeOrg AI Assistant"
                                width={300}
                                height={120}
                                className="w-45 h-45"
                                fallback={
                                    <div className="w-72 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center">
                                        <div className="text-white text-2xl font-bold">
                                            WeOrg AI
                                        </div>
                                    </div>
                                }
                            />
                            <div className="absolute -inset-6 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                        </div>
                    </div>
                    <h1
                        className={`text-4xl font-bold mb-6 ${themeClasses.text}`}
                    >
                        Welcome to WeOrg AI Assistant
                    </h1>
                    <p
                        className={`text-xl leading-relaxed ${themeClasses.textSecondary} mb-4`}
                    >
                        Your intelligent companion powered by advanced AI. 
                    </p>
                    <p
                        className={`text-lg leading-relaxed ${themeClasses.textMuted}`}
                    >
                        Streamlining operations for governments and enterprises
                        across Africa with people-first AI technology.
                    </p>
                </div>
            </div>

            {/* Right side sign-in */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-md">
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <SafeImage
                                src="/logo_full_b.svg"
                                alt="WeOrg AI Assistant"
                                width={200}
                                height={80}
                                className="w-48 h-auto"
                                fallback={
                                    <div className="w-48 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                        <div className="text-white text-lg font-bold">
                                            WeOrg AI
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                        <h1
                            className={`text-2xl font-bold ${themeClasses.text}`}
                        >
                            WeOrg AI Assistant
                        </h1>
                    </div>

                    <div
                        className={`rounded-2xl shadow-2xl border p-8 backdrop-blur-sm ${themeClasses.bgSecondary} ${themeClasses.border}`}
                    >
                        <div className="text-center mb-8">
                            <h2
                                className={`text-2xl font-bold mb-2 ${themeClasses.text}`}
                            >
                                Sign In
                            </h2>
                            <p className={`${themeClasses.textMuted}`}>
                                Access your AI-powered workspace
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div>
                                <label
                                    className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}
                                >
                                    User ID
                                </label>
                                <input
                                    ref={userIdRef}
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    onKeyDown={(
                                        e: React.KeyboardEvent<HTMLInputElement>
                                    ) => {
                                        if (e.key === "Enter") handleSubmit(e);
                                    }}
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${themeClasses.bgTertiary} ${themeClasses.border} ${themeClasses.text} placeholder-gray-400`}
                                    placeholder="Enter your User ID"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label
                                    className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        onKeyDown={(
                                            e: React.KeyboardEvent<HTMLInputElement>
                                        ) => {
                                            if (e.key === "Enter")
                                                handleSubmit(e);
                                        }}
                                        className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${themeClasses.bgTertiary} ${themeClasses.border} ${themeClasses.text} placeholder-gray-400`}
                                        placeholder="Enter your password"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${themeClasses.textMuted} ${themeClasses.hoverSecondary}`}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={
                                    isLoading ||
                                    !userId.trim() ||
                                    !password.trim()
                                }
                                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Signing In...
                                    </div>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </div>

                        <div className="mt-8 text-center">
                            <p className={`text-xs ${themeClasses.textMuted}`}>
                                Secure access to WeOrg AI Assistant - Built for
                                people, powered by AI
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
