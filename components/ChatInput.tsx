"use client";

import { useState, useRef } from "react";

interface ChatInputProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSearch, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const query = value.trim();
    if (!query || isLoading) return;
    onSearch(query);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative rounded-2xl shadow-xl shadow-sky/20 bg-white/80 backdrop-blur-md border border-sky/30 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Try: "seafood dinner under LKR 1500 near the fort" or "chill bar for sunset, not too crowded"`}
            rows={3}
            className="w-full px-5 pt-5 pb-14 text-base text-ocean leading-relaxed resize-none outline-none placeholder:text-ocean/30 bg-transparent"
          />

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3.5 pointer-events-none">
            <span className="text-xs font-medium text-ocean/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral inline-block animate-pulse" />
              Powered by AI
            </span>

            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="flex items-center gap-2 bg-ocean hover:bg-ocean/90 disabled:opacity-40 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all pointer-events-auto shadow-md shadow-ocean/20"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Finding…
                </>
              ) : (
                "Discover →"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
