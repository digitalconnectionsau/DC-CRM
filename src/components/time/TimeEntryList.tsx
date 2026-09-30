"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

interface TimeEntry {
  id: string;
  description: string;
  durationMinutes: number | null;
  startTime: string;
  billable: boolean;
  workType: "REMOTE" | "ONSITE";
  user: { id: string; name: string };
  ticket: { id: string; title: string } | null;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TimeEntryList({ entries, currentUserId, isAdmin }: {
  entries: TimeEntry[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this time entry?")) return;
    setDeleting(id);
    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      toast.success("Entry deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete");
    }
  }

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No time entries yet.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-3 py-3 group">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{e.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{formatDate(e.startTime)}</span>
              {e.ticket && (
                <a href={`/tickets/${e.ticket.id}`} className="text-xs text-brand-600 hover:underline truncate max-w-[200px]">
                  #{e.ticket.title}
                </a>
              )}
              <Badge label={e.workType === "ONSITE" ? "On-site" : "Remote"} variant={e.workType === "ONSITE" ? "orange" : "blue"} />
              <Badge label={e.billable ? "Billable" : "Non-billable"} variant={e.billable ? "green" : "gray"} />
              {isAdmin && <span className="text-xs text-gray-400">{e.user.name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-semibold text-gray-700 tabular-nums">
              {formatDuration(e.durationMinutes)}
            </span>
            {(isAdmin || e.user.id === currentUserId) && (
              <button
                onClick={() => handleDelete(e.id)}
                disabled={deleting === e.id}
                className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
