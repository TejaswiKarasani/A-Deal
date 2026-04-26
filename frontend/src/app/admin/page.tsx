"use client";
import { useEffect, useState } from "react";
import { createRun, listAllRuns, listUsers, updateRun, updateUser } from "@/lib/api";

const MODELS = ["all_opus", "all_haiku", "mixed_50_50", "custom"];
const USER_MODELS = ["", "claude-opus-4-7", "claude-haiku-4-5", "deepseek-ai/deepseek-r1-0528", "meta/llama-3.3-70b-instruct"];

type AdminRun = {
  id: number; name: string; model_assignment: string;
  is_real: boolean; is_public: boolean; status: string;
  start_at?: string | null; end_at?: string | null;
};
type AdminUser = {
  id: number; name: string; email: string;
  onboarding_complete: boolean; agent_model?: string | null;
};

export default function AdminPage() {
  const [runs, setRuns] = useState<AdminRun[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", model_assignment: "all_opus",
    is_real: true, is_public: true, start_at: "", end_at: "",
  });

  const refresh = async () => {
    const [r, u] = await Promise.all([listAllRuns(), listUsers()]);
    setRuns(r.data);
    setUsers(u.data);
  };

  useEffect(() => { refresh().catch(() => setError("Could not load admin data.")); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createRun({ ...form, start_at: form.start_at || null, end_at: form.end_at || null });
      setForm({ ...form, name: "", start_at: "", end_at: "" });
      await refresh();
    } catch { setError("Could not create run."); }
  };

  const changeStatus = async (id: number, status: string) => {
    await updateRun(id, { status });
    await refresh();
  };

  const changeModel = async (id: number, agent_model: string) => {
    await updateUser(id, { agent_model: agent_model || null });
    await refresh();
  };

  const statusBadge = (s: string) => {
    const cls: Record<string, string> = { active: "badge-active", pending: "badge-pending", closed: "badge-closed" };
    return <span className={cls[s] ?? "badge bg-gray-700 text-gray-300"}>{s}</span>;
  };

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-gray-400 text-sm mt-0.5">Create runs, manage the market, assign models.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Create run */}
      <section className="card p-6 mb-6">
        <h2 className="font-semibold mb-4">Create New Run</h2>
        <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Run name</label>
            <input className="input" placeholder="e.g. Run A" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Model assignment</label>
            <select className="input" value={form.model_assignment}
              onChange={(e) => setForm({ ...form, model_assignment: e.target.value })}>
              {MODELS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start (optional)</label>
            <input className="input" type="datetime-local" value={form.start_at}
              onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
          </div>
          <div>
            <label className="label">End (optional)</label>
            <input className="input" type="datetime-local" value={form.end_at}
              onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
          </div>
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.is_real}
                onChange={(e) => setForm({ ...form, is_real: e.target.checked })}
                className="accent-indigo-500" />
              This is the real run
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                className="accent-indigo-500" />
              Visible to participants
            </label>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full py-2.5">Create Run</button>
          </div>
        </form>
      </section>

      {/* Runs list */}
      <section className="card p-6 mb-6">
        <h2 className="font-semibold mb-4">Runs ({runs.length})</h2>
        {runs.length === 0 && <p className="text-gray-500 text-sm">No runs yet.</p>}
        <div className="space-y-3">
          {runs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{r.name}</p>
                  {statusBadge(r.status)}
                  {r.is_real && <span className="badge bg-indigo-500/20 text-indigo-300">real</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{r.model_assignment} · {r.is_public ? "public" : "private"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => changeStatus(r.id, "active")} disabled={r.status === "active"}
                  className="btn-success py-1.5 px-3 text-xs disabled:opacity-30">
                  Open
                </button>
                <button onClick={() => changeStatus(r.id, "closed")} disabled={r.status === "closed"}
                  className="btn-danger py-1.5 px-3 text-xs disabled:opacity-30">
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Users */}
      <section className="card p-6">
        <h2 className="font-semibold mb-4">Users ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Model override</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/60">
                  <td className="py-3 pr-4 font-medium">{u.name}</td>
                  <td className="py-3 pr-4 text-gray-400">{u.email}</td>
                  <td className="py-3 pr-4">
                    {u.onboarding_complete
                      ? <span className="badge-active">Ready</span>
                      : <span className="badge-pending">Pending</span>}
                  </td>
                  <td className="py-3">
                    <select className="input py-1.5 text-xs w-auto" value={u.agent_model || ""}
                      onChange={(e) => changeModel(u.id, e.target.value)}>
                      {USER_MODELS.map((m) => <option key={m} value={m}>{m || "Default"}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
