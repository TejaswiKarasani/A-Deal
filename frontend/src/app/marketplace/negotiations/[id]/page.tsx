"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRuns, getDeals } from "@/lib/api";
import api from "@/lib/api";

interface Message {
  role: "buyer" | "seller";
  content: string;
  timestamp: string;
}

interface Negotiation {
  id: number;
  status: string;
  item: string;
  buyer_id: number;
  seller_id: number;
  round_count: number;
  messages: Message[];
}

export default function NegotiationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [neg, setNeg] = useState<Negotiation | null>(null);
  const [error, setError] = useState("");
  const [runId, setRunId] = useState<number | null>(null);

  // We need the run_id to call the endpoint — find it from available runs
  useEffect(() => {
    getRuns().then((r) => {
      if (r.data.length > 0) setRunId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!runId) return;
    api
      .get(`/marketplace/runs/${runId}/negotiations/${id}`)
      .then((r) => setNeg(r.data))
      .catch((e) => {
        if (e.response?.status === 403) setError("This is not your negotiation.");
        else if (e.response?.status === 404) setError("Negotiation not found.");
        else setError("Failed to load negotiation.");
      });
  }, [id, runId]);

  const statusColour: Record<string, string> = {
    open: "text-yellow-400",
    accepted: "text-green-400",
    rejected: "text-red-400",
    expired: "text-gray-400",
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      {!neg && !error && (
        <p className="text-gray-500 animate-pulse">Loading negotiation…</p>
      )}

      {neg && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">{neg.item}</h1>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>
                Status:{" "}
                <span className={`font-semibold ${statusColour[neg.status] ?? "text-white"}`}>
                  {neg.status}
                </span>
              </span>
              <span>Rounds: {neg.round_count}</span>
              <span>Buyer #{neg.buyer_id}</span>
              <span>Seller #{neg.seller_id}</span>
            </div>
          </div>

          <div className="space-y-3">
            {neg.messages.length === 0 && (
              <p className="text-gray-500 text-sm">No messages yet.</p>
            )}
            {neg.messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "buyer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "buyer"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  <p className="font-semibold text-xs opacity-70 mb-1 uppercase tracking-wide">
                    {msg.role}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-50 mt-2">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
