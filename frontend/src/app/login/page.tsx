"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingStatus, login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await login(email, password);
      localStorage.setItem("token", response.data.access_token);
      const status = await getOnboardingStatus();
      router.push(status.data.complete ? "/marketplace" : "/onboarding");
    } catch {
      setError("Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-2xl shadow-black/30">
        <p className="text-blue-400 text-sm font-semibold mb-2">Welcome back</p>
        <h1 className="text-3xl font-bold mb-6">Log in to A-Deal</h1>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Email
            <input
              className="bg-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 ring-blue-500 text-white"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Password
            <input
              className="bg-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 ring-blue-500 text-white"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-gray-400 py-3 rounded-lg font-semibold transition"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="text-gray-500 text-sm mt-4 text-center">
          New here? <a href="/register" className="text-blue-400 hover:underline">Create an account</a>
        </p>
      </div>
    </main>
  );
}
