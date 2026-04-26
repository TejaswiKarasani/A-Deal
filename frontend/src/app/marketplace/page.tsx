"use client";
import { useEffect, useState } from "react";
import { getRuns, getListings, getDeals, getMyDeals } from "@/lib/api";
import type { Run, Listing, Deal, MyDeals } from "@/types";

export default function MarketplacePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [myDeals, setMyDeals] = useState<MyDeals>({ sold: [], bought: [] });
  const [tab, setTab] = useState<"listings" | "deals" | "mine">("listings");

  const selectedRunData = runs.find((r) => r.id === selectedRun);

  useEffect(() => {
    getRuns().then((r) => {
      setRuns(r.data);
      if (r.data.length > 0) setSelectedRun(r.data[0].id);
    });
    getMyDeals().then((r) => setMyDeals(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    getListings(selectedRun).then((r) => setListings(r.data));
    getDeals(selectedRun).then((r) => setDeals(r.data));
  }, [selectedRun]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: "badge-active", pending: "badge-pending", closed: "badge-closed" };
    return <span className={map[s] ?? "badge bg-gray-700 text-gray-300"}>{s}</span>;
  };

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-gray-400 text-sm mt-0.5">Your AI agent is negotiating on your behalf.</p>
        </div>
      </div>

      {/* Run selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {runs.length === 0 && <p className="text-gray-500 text-sm">No runs yet. Ask an admin to create one.</p>}
        {runs.map((r) => (
          <button key={r.id} onClick={() => setSelectedRun(r.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${
              selectedRun === r.id
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500"
            }`}>
            {r.name}
            {statusBadge(r.status)}
          </button>
        ))}
      </div>

      {selectedRunData?.status === "closed" && selectedRun && (
        <a href={`/survey/${selectedRun}`}
          className="inline-flex items-center gap-2 mb-6 card px-4 py-3 text-sm text-purple-300 border-purple-800/50 hover:bg-purple-900/20 transition">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          This run is closed — rate your experience →
        </a>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {(["listings", "deals", "mine"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t ? "border-indigo-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}>
            {t === "listings" ? `Active Listings (${listings.length})` : t === "deals" ? `Closed Deals (${deals.length})` : "My Deals"}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <div className="space-y-3">
          {listings.length === 0 && <p className="text-gray-500 text-sm py-8 text-center">No active listings yet.</p>}
          {listings.map((l) => (
            <div key={l.listing_id} className="card p-4 flex justify-between items-start hover:border-gray-700 transition">
              <div>
                <p className="font-semibold">{l.name}</p>
                {l.description && <p className="text-sm text-gray-400 mt-0.5">{l.description}</p>}
                <div className="flex gap-2 mt-2">
                  {l.category && <span className="badge bg-gray-800 text-gray-400">{l.category}</span>}
                  <span className="text-xs text-gray-500">Seller #{l.seller_id}</span>
                </div>
              </div>
              <span className="text-emerald-400 font-bold text-lg ml-4 shrink-0">${l.asking_price}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "deals" && (
        <div className="space-y-3">
          {deals.length === 0 && <p className="text-gray-500 text-sm py-8 text-center">No deals closed yet.</p>}
          {deals.map((d) => (
            <a key={d.deal_id} href={`/marketplace/negotiations/${d.negotiation_id}`}
              className="card p-4 flex justify-between items-center hover:border-gray-700 hover:bg-gray-900/80 transition cursor-pointer">
              <div>
                <p className="font-semibold">{d.item}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Buyer #{d.buyer_id} ← Seller #{d.seller_id}
                </p>
                <p className="text-xs text-indigo-400 mt-1">View transcript →</p>
              </div>
              <span className="text-emerald-400 font-bold text-lg ml-4 shrink-0">${d.final_price}</span>
            </a>
          ))}
        </div>
      )}

      {tab === "mine" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Items I Sold</h3>
            {myDeals.sold.length === 0 && <p className="text-gray-600 text-sm">Nothing sold yet.</p>}
            {myDeals.sold.map((d, i) => (
              <div key={i} className="card p-4 mb-2 flex justify-between items-center">
                <p className="text-sm">{d.item}</p>
                <span className="text-emerald-400 font-bold">+${d.price}</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Items I Bought</h3>
            {myDeals.bought.length === 0 && <p className="text-gray-600 text-sm">Nothing bought yet.</p>}
            {myDeals.bought.map((d, i) => (
              <div key={i} className="card p-4 mb-2 flex justify-between items-center">
                <p className="text-sm">{d.item}</p>
                <span className="text-red-400 font-bold">-${d.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
