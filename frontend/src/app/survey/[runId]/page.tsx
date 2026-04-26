"use client";

import { useEffect, useState } from "react";
import { getDeals, getMySurvey, submitSurvey } from "@/lib/api";

type Deal = { deal_id: number; item: string; final_price: number; buyer_id: number; seller_id: number };

type ExistingSurvey = {
  overall_satisfaction: number;
  fairness_scores: Record<string, number>;
  preferred_run_rank: number[];
  willing_to_pay: boolean;
  wtp_amount?: number | null;
};

export default function SurveyPage({ params }: { params: { runId: string } }) {
  const runId = Number(params.runId);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [overall, setOverall] = useState<number | "">("");
  const [fairness, setFairness] = useState<Record<string, number>>({});
  const [rank, setRank] = useState("1,2,3,4");
  const [willingToPay, setWillingToPay] = useState(false);
  const [amount, setAmount] = useState("");
  const [existing, setExisting] = useState<ExistingSurvey | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getDeals(runId).then((response) => setDeals(response.data)).catch(() => setDeals([]));
    getMySurvey(runId)
      .then((response) => {
        setExisting(response.data);
        setOverall(response.data.overall_satisfaction);
        setFairness(response.data.fairness_scores || {});
        setRank((response.data.preferred_run_rank || []).join(","));
        setWillingToPay(Boolean(response.data.willing_to_pay));
        setAmount(response.data.wtp_amount?.toString() || "");
      })
      .catch(() => {});
  }, [runId]);

  const readOnly = Boolean(existing) || submitted;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!overall) {
      setError("Please rate your overall satisfaction before submitting.");
      return;
    }
    try {
      await submitSurvey(runId, {
        overall_satisfaction: overall,
        fairness_scores: fairness,
        preferred_run_rank: rank.split(",").map((value) => Number(value.trim())).filter(Boolean),
        willing_to_pay: willingToPay,
        wtp_amount: willingToPay && amount ? Number(amount) : null,
      });
      setSubmitted(true);
    } catch {
      setError("Could not submit survey. You may have already submitted it.");
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl bg-gray-900 p-8 text-center">
          <h1 className="text-3xl font-bold mb-3">Thank you</h1>
          <p className="text-gray-400">Your response has been recorded.</p>
          <a href="/marketplace" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold">Back to marketplace</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Post-market survey</h1>
      <p className="text-gray-400 mb-6">Run #{runId}. Your answers help evaluate market quality.</p>
      {existing && <p className="mb-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-300">You already submitted this survey. Showing read-only answers.</p>}
      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl bg-gray-900 p-5">
          <label className="font-semibold">Overall satisfaction: {overall || "not set"}</label>
          <input disabled={readOnly} type="range" min="1" max="7" value={overall || 4} onChange={(e) => setOverall(Number(e.target.value))} className="mt-4 w-full" />
          <div className="flex justify-between text-xs text-gray-500"><span>1</span><span>7</span></div>
        </section>

        <section className="rounded-2xl bg-gray-900 p-5">
          <h2 className="font-semibold mb-3">Fairness per deal</h2>
          {deals.length === 0 && <p className="text-sm text-gray-500">No closed deals found for this run.</p>}
          {deals.map((deal) => (
            <label key={deal.deal_id} className="mb-4 block">
              <span className="text-sm text-gray-300">{deal.item} (${deal.final_price}) — {fairness[String(deal.deal_id)] || 4}/7</span>
              <input disabled={readOnly} type="range" min="1" max="7" value={fairness[String(deal.deal_id)] || 4} onChange={(e) => setFairness({ ...fairness, [String(deal.deal_id)]: Number(e.target.value) })} className="mt-2 w-full" />
            </label>
          ))}
        </section>

        <section className="rounded-2xl bg-gray-900 p-5">
          <label className="font-semibold">Preferred run rank</label>
          <p className="text-xs text-gray-500 mb-2">Enter run IDs best-to-worst, comma separated.</p>
          <input disabled={readOnly} className="w-full rounded-lg bg-gray-800 px-4 py-3" value={rank} onChange={(e) => setRank(e.target.value)} />
        </section>

        <section className="rounded-2xl bg-gray-900 p-5">
          <label className="flex items-center gap-2"><input disabled={readOnly} type="checkbox" checked={willingToPay} onChange={(e) => setWillingToPay(e.target.checked)} /> I would pay to use this market</label>
          {willingToPay && <input disabled={readOnly} className="mt-3 w-full rounded-lg bg-gray-800 px-4 py-3" type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </section>

        {!readOnly && <button className="w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-700">Submit survey</button>}
      </form>
    </main>
  );
}
