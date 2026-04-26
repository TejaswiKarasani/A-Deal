"use client";

import { useEffect, useState } from "react";
import { createRun, listAllRuns, listUsers, updateRun, updateUser } from "@/lib/api";

const MODELS = ["all_opus", "all_haiku", "mixed_50_50", "custom"];
const USER_MODELS = ["", "claude-opus-4-7", "claude-haiku-4-5", "deepseek-ai/deepseek-r1-0528"];

type Run = {
  id: number;
  name: string;
  model_assignment: string;
  is_real: boolean;
  is_public: boolean;
  status: string;
  start_at?: string | null;
  end_at?: string | null;
};

type User = {
  id: number;
  name: string;
  email: string;
  onboarding_complete: boolean;
  agent_model?: string | null;
};

export default function AdminPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    model_assignment: "all_opus",
    is_real: true,
    is_public: true,
    start_at: "",
    end_at: "",
  });

  const refresh = async () => {
    const [runResponse, userResponse] = await Promise.all([listAllRuns(), listUsers()]);
    setRuns(runResponse.data);
    setUsers(userResponse.data);
  };

  useEffect(() => {
    refresh().catch(() => setError("Could not load admin data. Please log in again."));
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await createRun({
        ...form,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
      });
      setForm({ ...form, name: "", start_at: "", end_at: "" });
      await refresh();
    } catch {
      setError("Could not create run.");
    }
  };

  const changeRunStatus = async (runId: number, status: "active" | "closed") => {
    await updateRun(runId, { status });
    await refresh();
  };

  const changeUserModel = async (userId: number, agent_model: string) => {
    await updateUser(userId, { agent_model: agent_model || null });
    await refresh();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Marketplace Control Panel</h1>
      <p className="text-gray-400 mb-6">Create runs, open or close markets, and manage model overrides.</p>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <section className="bg-gray-900 rounded-2xl p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create Run</h2>
        <form onSubmit={handleCreate} className="grid md:grid-cols-3 gap-4">
          <input
            className="bg-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 ring-blue-500"
            placeholder="Run name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <select
            className="bg-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 ring-blue-500"
            value={form.model_assignment}
            onChange={(event) => setForm({ ...form, model_assignment: event.target.value })}
          >
            {MODELS.map((model) => <option key={model}>{model}</option>)}
          </select>
          <div className="flex gap-4 items-center text-sm text-gray-300">
            <label><input type="checkbox" checked={form.is_real} onChange={(e) => setForm({ ...form, is_real: e.target.checked })} /> Real</label>
            <label><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /> Public</label>
          </div>
          <input type="datetime-local" className="bg-gray-800 rounded-lg px-4 py-3" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
          <input type="datetime-local" className="bg-gray-800 rounded-lg px-4 py-3" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
          <button className="bg-blue-600 hover:bg-blue-700 rounded-lg py-3 font-semibold">Create Run</button>
        </form>
      </section>

      <section className="bg-gray-900 rounded-2xl p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4">Runs</h2>
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="bg-gray-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{run.name}</p>
                <p className="text-xs text-gray-400">{run.model_assignment} · {run.is_real ? "real" : "test"} · {run.is_public ? "public" : "private"}</p>
              </div>
              <span className="rounded-full bg-gray-700 px-3 py-1 text-xs uppercase tracking-wide">{run.status}</span>
              <div className="flex gap-2">
                <button onClick={() => changeRunStatus(run.id, "active")} disabled={run.status === "active"} className="rounded-lg bg-green-600 px-3 py-2 text-sm disabled:opacity-40">Open</button>
                <button onClick={() => changeRunStatus(run.id, "closed")} disabled={run.status === "closed"} className="rounded-lg bg-red-600 px-3 py-2 text-sm disabled:opacity-40">Close</button>
              </div>
            </div>
          ))}
          {runs.length === 0 && <p className="text-gray-500">No runs yet.</p>}
        </div>
      </section>

      <section className="bg-gray-900 rounded-2xl p-5">
        <h2 className="text-xl font-semibold mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-400"><tr><th className="py-2">User</th><th>Email</th><th>Onboarding</th><th>Model override</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-800">
                  <td className="py-3">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.onboarding_complete ? "Complete" : "Pending"}</td>
                  <td>
                    <select className="bg-gray-800 rounded-lg px-3 py-2" value={user.agent_model || ""} onChange={(e) => changeUserModel(user.id, e.target.value)}>
                      {USER_MODELS.map((model) => <option key={model} value={model}>{model || "Default"}</option>)}
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
