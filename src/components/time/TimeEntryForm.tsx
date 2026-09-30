"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Ticket {
  id: string;
  title: string;
}

interface User {
  id: string;
  name: string;
}

interface TimeEntryFormProps {
  /** Pre-fill the ticket when opened from a ticket page */
  defaultTicketId?: string;
  /** Called after a successful save */
  onSaved?: () => void;
  isAdmin?: boolean;
  users?: User[];
}

export function TimeEntryForm({ defaultTicketId, onSaved, isAdmin, users = [] }: TimeEntryFormProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [ticketId, setTicketId] = useState(defaultTicketId ?? "");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [billable, setBillable] = useState(true);
  const [workType, setWorkType] = useState<"REMOTE" | "ONSITE">("REMOTE");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  // Timer state
  const [mode, setMode] = useState<"timer" | "manual">("timer");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual mode
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startTimer() {
    startRef.current = new Date();
    setRunning(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    let startTime: Date;
    let endTime: Date | null = null;
    let durationMinutes: number;

    if (mode === "timer") {
      if (!startRef.current) {
        toast.error("Start the timer first");
        return;
      }
      if (running) stopTimer();
      startTime = startRef.current;
      endTime = new Date();
      durationMinutes = Math.round(elapsed / 60);
    } else {
      const h = parseInt(manualHours || "0", 10);
      const m = parseInt(manualMinutes || "0", 10);
      durationMinutes = h * 60 + m;
      if (durationMinutes <= 0) {
        toast.error("Enter a duration greater than 0");
        return;
      }
      startTime = new Date(`${manualDate}T09:00:00`);
      endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    }

    setLoading(true);
    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        ticketId: ticketId || null,
        startTime: startTime.toISOString(),
        endTime: endTime?.toISOString() ?? null,
        durationMinutes,
        billable,
        workType,
        ...(isAdmin && userId ? { userId } : {}),
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Time entry saved");
      setDescription("");
      setTicketId(defaultTicketId ?? "");
      setElapsed(0);
      startRef.current = null;
      setManualHours("");
      setManualMinutes("");
      router.refresh();
      onSaved?.();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to save time entry");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit text-sm">
        <button
          type="button"
          onClick={() => { setMode("timer"); if (running) stopTimer(); }}
          className={`px-4 py-1.5 font-medium transition-colors ${mode === "timer" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          Timer
        </button>
        <button
          type="button"
          onClick={() => { setMode("manual"); if (running) stopTimer(); }}
          className={`px-4 py-1.5 font-medium transition-colors ${mode === "manual" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          Manual
        </button>
      </div>

      {/* Timer display */}
      {mode === "timer" && (
        <div className="flex items-center gap-4">
          <span className="text-3xl font-mono font-semibold text-gray-800 tabular-nums">
            {formatElapsed(elapsed)}
          </span>
          {!running ? (
            <button
              type="button"
              onClick={startTimer}
              className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600"
            >
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={stopTimer}
              className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Manual duration + date */}
      {mode === "manual" && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={23}
              placeholder="0"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
              className="w-16 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-500">h</span>
            <input
              type="number"
              min={0}
              max={59}
              placeholder="0"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              className="w-16 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-500">min</span>
          </div>
          <input
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What did you work on?"
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Ticket */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ticket (optional)</label>
          <select
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">No ticket</option>
            {tickets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Work type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Work type</label>
          <select
            value={workType}
            onChange={(e) => setWorkType(e.target.value as "REMOTE" | "ONSITE")}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="REMOTE">Remote</option>
            <option value="ONSITE">On-site</option>
          </select>
        </div>
      </div>

      {/* Admin: assign to user */}
      {isAdmin && users.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Log for user</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Myself</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Billable toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="rounded border-gray-300 text-brand-600"
          />
          Billable
        </label>
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-600 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Entry"}
        </button>
      </div>
    </form>
  );
}
