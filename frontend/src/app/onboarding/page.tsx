"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendInterviewMessage, confirmProfile } from "@/lib/api";

interface Message { role: "user" | "assistant"; content: string }

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<object | null>(null);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    handleSend("Hi, I'm ready to set up my agent.");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text ?? input;
    if (!message.trim() || loading) return;
    setInput("");
    setLoading(true);
    const userMsg: Message = { role: "user", content: message };
    const history = [...messages, userMsg];
    setMessages(history);
    try {
      const res = await sendInterviewMessage(message, messages);
      setMessages([...history, { role: "assistant", content: res.data.reply }]);
      if (res.data.profile) setProfile(res.data.profile);
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
    <main className="h-[calc(100vh-56px)] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <h1 className="font-bold text-lg">Onboarding Interview</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Tell Claude what you want to buy &amp; sell. Your AI agent will do the rest.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold mr-2 mt-1 shrink-0">
                AI
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
              m.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm"
                : "bg-gray-800 text-gray-100 rounded-bl-sm"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold mr-2 shrink-0">AI</div>
            <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
              <span className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Profile confirm */}
      {profile && (
        <div className="border-t border-gray-800 bg-gray-900/60 px-4 py-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <p className="text-sm text-emerald-400 font-medium">
              Profile extracted — review and confirm to activate your agent.
            </p>
          </div>
          <pre className="text-xs text-gray-400 bg-gray-800 border border-gray-700 p-3 rounded-lg overflow-auto max-h-36 mb-3">
            {JSON.stringify(profile, null, 2)}
          </pre>
          <button onClick={handleConfirm} disabled={confirming} className="btn-success w-full py-2.5">
            {confirming ? "Activating…" : "Confirm & Activate Agent"}
          </button>
        </div>
      )}

      {/* Input */}
      {!profile && (
        <div className="border-t border-gray-800 px-4 py-3">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="btn-primary px-5">
              Send
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
