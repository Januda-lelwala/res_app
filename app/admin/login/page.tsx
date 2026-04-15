"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Incorrect password.");
    }
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-seafoam to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-ocean mb-1">Admin</h1>
        <p className="text-ocean/50 text-sm mb-6">Enter the admin password to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            className="w-full border border-sand/60 rounded-xl px-3 py-2.5 text-sm text-ocean placeholder-ocean/30 focus:outline-none focus:border-sky"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-coral text-xs">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-2.5 rounded-xl bg-ocean text-white text-sm font-semibold hover:bg-ocean/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
