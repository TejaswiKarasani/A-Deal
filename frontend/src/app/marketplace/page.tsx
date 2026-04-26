"use client";
import { useEffect, useState } from "react";
import { getRuns, getListings, getDeals, getMyDeals } from "@/lib/api";

export default function MarketplacePage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<number | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [myDeals, setMyDeals] = useState<any>({ sold: [], bought: [] });
  const [tab, setTab] = useState<"listings" | "deals" | "mine">("listings");
  const selectedRunDetails = runs.find((run) => run.id === selectedRun);

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

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
      <p className="text-gray-400 mb-6">Your AI agent is negotiating on your behalf.</p>

      {/* Run selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {runs.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRun(r.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedRun === r.id
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {r.name} ({r.status})
          </button>
        ))}
      </div>

      {selectedRunDetails?.status === "closed" && selectedRun && (
        <a
          href={`/survey/${selectedRun}`}
          className="mb-6 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-700"
        >
          Rate your experience
        </a>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-800 mb-6">
        {(["listings", "deals", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium transition border-b-2 ${
              tab === t
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "listings" ? "Active Listings" : t === "deals" ? "Closed Deals" : "My Deals"}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <div className="space-y-3">
          {listings.length === 0 && <p className="text-gray-500">No active listings.</p>}
          {listings.map((l) => (
            <div key={l.listing_id} className="bg-gray-900 rounded-xl p-4 flex justify-between items-start">
              <div>
                <p className="font-semibold">{l.name}</p>
                <p className="text-sm text-gray-400">{l.description}</p>
                <p className="text-xs text-gray-500 mt-1">Category: {l.category}</p>
              </div>
              <p className="text-green-400 font-bold text-lg">${l.asking_price}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "deals" && (
        <div className="space-y-3">
          {deals.length === 0 && <p className="text-gray-500">No deals closed yet.</p>}
          {deals.map((d) => (
            <a
              key={d.deal_id}
              href={`/marketplace/negotiations/${d.negotiation_id}`}
              className="bg-gray-900 rounded-xl p-4 flex justify-between hover:bg-gray-800 transition cursor-pointer"
            >
              <div>
                <p className="font-semibold">{d.item}</p>
                <p className="text-xs text-gray-500">
                  Buyer #{d.buyer_id} ← Seller #{d.seller_id}
                </p>
                <p className="text-xs text-blue-400 mt-1">View transcript →</p>
              </div>
              <p className="text-green-400 font-bold">${d.final_price}</p>
            </a>
          ))}
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Items I Sold</h3>
            {myDeals.sold.length === 0 && <p className="text-gray-500 text-sm">None yet.</p>}
            {myDeals.sold.map((d: any, i: number) => (
              <div key={i} className="bg-gray-900 rounded-xl p-4 mb-2 flex justify-between">
                <p>{d.item}</p>
                <p className="text-green-400 font-bold">+${d.price}</p>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Items I Bought</h3>
            {myDeals.bought.length === 0 && <p className="text-gray-500 text-sm">None yet.</p>}
            {myDeals.bought.map((d: any, i: number) => (
              <div key={i} className="bg-gray-900 rounded-xl p-4 mb-2 flex justify-between">
                <p>{d.item}</p>
                <p className="text-red-400 font-bold">-${d.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
