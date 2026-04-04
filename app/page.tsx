"use client";

import { useState } from "react";

export default function Home() {
  const [mode, setMode] = useState("idea");
  const [taskType, setTaskType] = useState("automation_brainstorm");
  const [inputData, setInputData] = useState("admin closeout process takes too long");
  const [systemKey, setSystemKey] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTask = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/run", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-ai-gateway-key": "pg_pilot_2026"
        },
        body: JSON.stringify({
          mode,
          task_type: taskType,
          input: { question: inputData },
          context: { system_key: systemKey },
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ ok: false, message: "Fetch error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 text-slate-50 p-10 font-sans">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
            AI Gateway Test
          </h1>
          <div className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            V1 Pilot Mode
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-slate-400">Mode</label>
            <select 
              className="bg-slate-900 border border-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              value={mode} 
              onChange={e => setMode(e.target.value)}
            >
              <option value="idea">Idea (Strategic Brainstorm)</option>
              <option value="answer">Answer (Project Q&A)</option>
              <option value="build">Build (Implementation Logic)</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-slate-400">Task Type</label>
            <select 
              className="bg-slate-900 border border-slate-800 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              value={taskType} 
              onChange={e => setTaskType(e.target.value)}
            >
              <option value="automation_brainstorm">Automation Brainstorm</option>
              <option value="project_qa">Project QA (Context-Aware)</option>
              <option value="n8n_workflow_design">N8N Workflow Design</option>
              <option value="sql_schema_design">SQL Schema Design</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-400">Input (Problem/Goal/Question)</label>
            <textarea 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 h-32 outline-none focus:ring-2 focus:ring-blue-500"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder="Enter your question or problem statement here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-400">Context Identifier (e.g. system_key)</label>
            <input 
              type="text"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500"
              value={systemKey}
              onChange={(e) => setSystemKey(e.target.value)}
              placeholder="e.g. booking-intake or ops-closeout"
            />
            <p className="text-xs text-slate-500 mt-2 ml-1">
              Gateway will fetch specific registry data from Supabase if a key matches.
            </p>
          </div>
        </div>

        <button 
          onClick={runTask}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all font-bold p-4 rounded-xl shadow-lg hover:shadow-blue-900/20 active:scale-[0.99]"
        >
          {loading ? "Orchestrating..." : "Execute Task"}
        </button>

        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-4 pb-4 border-sm border-slate-800">
              <h2 className="text-xl font-semibold">Response</h2>
              <span className={`px-2 py-1 rounded text-xs font-mono ${result.ok ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                {result.ok ? 'SUCCESS' : 'FAILED'}
              </span>
            </div>
            <pre className="text-sm font-mono text-slate-300 bg-black/40 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
