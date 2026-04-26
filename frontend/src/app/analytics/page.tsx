"use client";
import { useEffect, useState } from "react";
import { getRuns, getRunSummary, getAgentPerformance } from "@/lib/api";

interface Run { id: number; name: string; status: string; model_assignment: string }
interface Summary {
  run_id: number; items_listed: number; items_sold: number;
  sale_rate: number; total_deals: number; total_value: number;
  mean_price: number; median_price: number;
}
interface AgentRow {
  user_id: number; name: string; model: string | null;
  deals_as_seller: number; deals_as_buyer: number;
  total_earned: number; total_spent: number; net: number;
}

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
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

  // Sort agents by net descending for leaderboard
  const sorted = [...agents].sort((a, b) => b.net - a.net);

  const opusAgents = agents.filter((a) => a.model?.includes("opus"));
  const haikuAgents = agents.filter((a) => a.model?.includes("haiku"));
  const avg = (arr: AgentRow[], key: keyof AgentRow) =>
    arr.length ? (arr.reduce((s, a) => s + (a[key] as number), 0) / arr.length).toFixed(2) : "—";

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Analytics</h1>
      <p className="text-gray-400 mb-6">Market performance and model comparison.</p>

      {/* Run selector */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {runs.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRun(r.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedRun === r.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500 animate-pulse">Loading…</p>}

      {!loading && summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <div key={c.label} className="bg-gray-900 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                <p className="text-xl font-bold">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Model comparison — only for mixed runs */}
          {isMixed && opusAgents.length > 0 && haikuAgents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Model Comparison (Opus vs Haiku)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="text-left py-2 pr-6">Metric</th>
                      <th className="text-right py-2 pr-6">Opus</th>
                      <th className="text-right py-2">Haiku</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Avg deals as seller", key: "deals_as_seller" as keyof AgentRow },
                      { label: "Avg deals as buyer", key: "deals_as_buyer" as keyof AgentRow },
                      { label: "Avg earned ($)", key: "total_earned" as keyof AgentRow },
                      { label: "Avg spent ($)", key: "total_spent" as keyof AgentRow },
                      { label: "Avg net ($)", key: "net" as keyof AgentRow },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-gray-800/50">
                        <td className="py-2 pr-6 text-gray-300">{row.label}</td>
                        <td className="py-2 pr-6 text-right font-mono text-green-400">
                          {avg(opusAgents, row.key)}
                        </td>
                        <td className="py-2 text-right font-mono text-yellow-400">
                          {avg(haikuAgents, row.key)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Agent leaderboard */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Agent Leaderboard</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 pr-4">Model</th>
                    <th className="text-right py-2 pr-4">Sold</th>
                    <th className="text-right py-2 pr-4">Bought</th>
                    <th className="text-right py-2 pr-4">Earned</th>
                    <th className="text-right py-2 pr-4">Spent</th>
                    <th className="text-right py-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((a, i) => (
                    <tr key={a.user_id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                      <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-2 pr-4 font-medium">{a.name}</td>
                      <td className="py-2 pr-4 text-xs text-gray-400">
                        {a.model ? a.model.split("/").pop() : "default"}
                      </td>
                      <td className="py-2 pr-4 text-right">{a.deals_as_seller}</td>
                      <td className="py-2 pr-4 text-right">{a.deals_as_buyer}</td>
                      <td className="py-2 pr-4 text-right text-green-400">${a.total_earned}</td>
                      <td className="py-2 pr-4 text-right text-red-400">${a.total_spent}</td>
                      <td className={`py-2 text-right font-bold ${a.net >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {a.net >= 0 ? "+" : ""}${a.net}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-500">No deals yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !summary && selectedRun && (
        <p className="text-gray-500">No data for this run yet.</p>
      )}
    </main>
  );
}
