"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
    userId: string;
    createdAt: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [newUserId, setNewUserId] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resetUserId, setResetUserId] = useState("");
    const [resetPassword, setResetPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                const res = await fetch("/api/check-admin");
                const data: { isAdmin: boolean } = await res.json();
                if (data.isAdmin) {
                    setAuthorized(true);
                    fetchUsers();
                } else {
                    router.replace("/chat");
                }
            } catch {
                router.replace("/chat");
            } finally {
                setLoading(false);
            }
        };

        checkAdminAccess();
    }, [router]);

    const fetchUsers = async () => {
        const res = await fetch("/api/admin/users");
        const data: User[] = await res.json();
        setUsers(data);
    };

    const handleCreateUser = async () => {
        if (!newUserId || !newPassword) return;

        const res = await fetch("/api/admin/create-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: newUserId, password: newPassword }),
        });

        const data: { success?: boolean; error?: string } | null = await res.json().catch(() => null);

        if (!data || !data.success) {
            setMessage(`❌ ${data?.error || "Failed to create user"}`);
            return;
        }

        setMessage(`✅ User "${newUserId}" created`);
        setNewUserId("");
        setNewPassword("");
        fetchUsers();
    };

    const handleResetPassword = async () => {
        if (!resetUserId || !resetPassword) return;

        const res = await fetch("/api/admin/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: resetUserId, newPassword: resetPassword }),
        });

        const data: { success: boolean; error?: string } = await res.json();

        if (data.success) {
            setMessage(`🔐 Password for "${resetUserId}" updated`);
            setResetUserId("");
            setResetPassword("");
        } else {
            setMessage(`❌ ${data.error || "Failed to reset password"}`);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (userId === "admin") return;

        const confirmed = confirm(`Are you sure you want to delete user "${userId}"?`);
        if (!confirmed) return;

        const res = await fetch("/api/admin/delete-user", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });

        const data: { success: boolean; error?: string } = await res.json();

        if (data.success) {
            setMessage(`🗑️ User "${userId}" deleted`);
            fetchUsers();
        } else {
            setMessage(`❌ ${data.error || "Failed to delete user"}`);
        }
    };

    if (loading) {
        return <div className="p-6 text-center">Checking access...</div>;
    }

    if (!authorized) {
        return null;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between mb-6">
                <h1 className="text-3xl font-bold text-emerald-700">Admin Panel</h1>
                <button
                    onClick={() => router.push("/chat")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
                >
                    Chat
                </button>
            </div>

            {message && (
                <div className="mb-4 p-3 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {message}
                </div>
            )}

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">👥 All Users</h2>
                <div className="grid gap-4">
                    {users.map((user) => (
                        <div
                            key={user.userId}
                            className="border rounded-xl p-4 bg-white shadow-sm flex items-center justify-between"
                        >
                            <div>
                                <div className="font-semibold text-gray-800">{user.userId}</div>
                                <div className="text-sm text-gray-500">
                                    Created: {new Date(user.createdAt).toLocaleString()}
                                </div>
                            </div>
                            {user.userId !== "admin" ? (
                                <button
                                    onClick={() => handleDeleteUser(user.userId)}
                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md text-sm cursor-pointer"
                                >
                                    Delete
                                </button>
                            ) : (
                                <span className="text-gray-400 text-sm">Protected</span>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">➕ Add New User</h2>
                <div className="grid gap-3">
                    <input
                        className="border p-3 rounded-md w-full"
                        placeholder="User ID"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                    />
                    <div>
                        <input
                            className="border p-3 rounded-md w-full"
                            placeholder="Password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="text-sm text-emerald-700 mt-1 underline cursor-pointer"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                            {showNewPassword ? "Hide" : "Show"} Password
                        </button>
                    </div>
                    <button
                        onClick={handleCreateUser}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
                    >
                        Create User
                    </button>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold mb-4">🔁 Reset Password</h2>
                <div className="grid gap-3">
                    <input
                        className="border p-3 rounded-md w-full"
                        placeholder="User ID"
                        value={resetUserId}
                        onChange={(e) => setResetUserId(e.target.value)}
                    />
                    <div>
                        <input
                            className="border p-3 rounded-md w-full"
                            placeholder="New Password"
                            type={showResetPassword ? "text" : "password"}
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="text-sm text-blue-700 mt-1 underline cursor-pointer"
                            onClick={() => setShowResetPassword(!showResetPassword)}
                        >
                            {showResetPassword ? "Hide" : "Show"} Password
                        </button>
                    </div>
                    <button
                        onClick={handleResetPassword}
                        className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
                    >
                        Update Password
                    </button>
                </div>
            </section>
        </div>
    );
}
