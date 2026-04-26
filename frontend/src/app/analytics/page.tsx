"use client";
import { useEffect, useState } from "react";
import { getRuns, getRunSummary, getAgentPerformance } from "@/lib/api";
import type { Run, RunSummary, AgentPerformance } from "@/types";

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRuns().then((r) => {
      setRuns(r.data);
      if (r.data.length > 0) setSelectedRun(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    setLoading(true);
    Promise.all([getRunSummary(selectedRun), getAgentPerformance(selectedRun)])
      .then(([s, a]) => { setSummary(s.data); setAgents(a.data); })
      .finally(() => setLoading(false));
  }, [selectedRun]);

  const selectedRunData = runs.find((r) => r.id === selectedRun);
  const isMixed = selectedRunData?.model_assignment === "mixed_50_50";
  const sorted = [...agents].sort((a, b) => b.net - a.net);
  const opusAgents = agents.filter((a) => a.model?.includes("opus"));
  const haikuAgents = agents.filter((a) => a.model?.includes("haiku"));
  const avg = (arr: AgentPerformance[], key: keyof AgentPerformance) =>
    arr.length ? (arr.reduce((s, a) => s + (a[key] as number), 0) / arr.length).toFixed(2) : "—";

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-400 text-sm mt-0.5">Market performance and model comparison.</p>
      </div>

      {/* Run selector */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {runs.map((r) => (
          <button key={r.id} onClick={() => setSelectedRun(r.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
              selectedRun === r.id
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500"
            }`}>
            {r.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      )}

      {!loading && summary && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Deals", value: summary.total_deals },
              { label: "Total Value", value: `$${summary.total_value}` },
              { label: "Sale Rate", value: `${(summary.sale_rate * 100).toFixed(1)}%` },
              { label: "Mean Price", value: `$${summary.mean_price}` },
              { label: "Median Price", value: `$${summary.median_price}` },
              { label: "Items Listed", value: summary.items_listed },
              { label: "Items Sold", value: summary.items_sold },
              { label: "Model", value: selectedRunData?.model_assignment ?? "—" },
            ].map((c) => (
              <div key={c.label} className="stat-card">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-2xl font-bold text-white">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Model comparison */}
          {isMixed && opusAgents.length > 0 && haikuAgents.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4">Opus vs Haiku</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-3 font-medium">Metric</th>
                    <th className="text-right pb-3 pr-6 font-medium text-indigo-400">Opus</th>
                    <th className="text-right pb-3 font-medium text-yellow-400">Haiku</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Avg deals (seller)", key: "deals_as_seller" as keyof AgentPerformance },
                    { label: "Avg deals (buyer)", key: "deals_as_buyer" as keyof AgentPerformance },
                    { label: "Avg earned", key: "total_earned" as keyof AgentPerformance },
                    { label: "Avg spent", key: "total_spent" as keyof AgentPerformance },
                    { label: "Avg net", key: "net" as keyof AgentPerformance },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-gray-800/50">
                      <td className="py-2.5 text-gray-300">{row.label}</td>
                      <td className="py-2.5 text-right pr-6 font-mono text-indigo-300">{avg(opusAgents, row.key)}</td>
                      <td className="py-2.5 text-right font-mono text-yellow-300">{avg(haikuAgents, row.key)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Leaderboard */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Agent Leaderboard</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    {["#", "Name", "Model", "Sold", "Bought", "Earned", "Spent", "Net"].map((h) => (
                      <th key={h} className={`pb-3 font-medium ${h === "#" || h === "Name" || h === "Model" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-600">No deals yet.</td></tr>
                  )}
                  {sorted.map((a, i) => (
                    <tr key={a.user_id} className="border-b border-gray-800/40 hover:bg-gray-900/40">
                      <td className="py-3 text-gray-500 pr-4">{i + 1}</td>
                      <td className="py-3 font-medium pr-4">{a.name}</td>
                      <td className="py-3 text-xs text-gray-500 pr-4">{a.model?.split("/").pop() ?? "default"}</td>
                      <td className="py-3 text-right pr-4">{a.deals_as_seller}</td>
                      <td className="py-3 text-right pr-4">{a.deals_as_buyer}</td>
                      <td className="py-3 text-right pr-4 text-emerald-400">${a.total_earned}</td>
                      <td className="py-3 text-right pr-4 text-red-400">${a.total_spent}</td>
                      <td className={`py-3 text-right font-bold ${a.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {a.net >= 0 ? "+" : ""}${a.net}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && !summary && selectedRun && (
        <div className="card p-12 text-center text-gray-500">No data for this run yet.</div>
      )}
    </main>
  );
}
