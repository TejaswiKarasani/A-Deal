"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendInterviewMessage, confirmProfile } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<object | null>(null);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start the interview
    handleSend("Hi, I'm ready to set up my agent.");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text ?? input;
    if (!message.trim()) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", content: message };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    try {
      const res = await sendInterviewMessage(message, messages);
      const { reply, profile: extractedProfile } = res.data;
      setMessages([...newHistory, { role: "assistant", content: reply }]);
      if (extractedProfile) setProfile(extractedProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!profile) return;
    setConfirming(true);
    await confirmProfile(profile);
    router.push("/marketplace");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Onboarding Interview</h1>
        <p className="text-sm text-gray-400">Your AI interviewer is getting to know you.</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-2xl text-sm text-gray-400 animate-pulse">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {profile && (
        <div className="px-4 py-4 border-t border-gray-800 bg-gray-900 max-w-2xl mx-auto w-full">
          <p className="text-sm text-green-400 mb-2">
            Your profile is ready. Review and confirm to activate your agent.
          </p>
          <pre className="text-xs text-gray-400 bg-gray-800 p-3 rounded-lg overflow-auto max-h-40 mb-3">
            {JSON.stringify(profile, null, 2)}
          </pre>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {confirming ? "Activating your agent…" : "Confirm & Activate Agent"}
          </button>
        </div>
      )}

      {!profile && (
        <div className="px-4 py-4 border-t border-gray-800 max-w-2xl mx-auto w-full">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 ring-blue-500 text-sm"
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-semibold transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
