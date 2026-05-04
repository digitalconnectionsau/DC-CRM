"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";

const statuses = ["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED", "CLOSED"];

const statusVariant = (s: string) => {
  if (s === "OPEN") return "blue";
  if (s === "IN_PROGRESS") return "yellow";
  if (s === "WAITING_ON_CLIENT") return "orange";
  if (s === "RESOLVED") return "green";
  return "gray";
};

export function TicketStatusSelect({ ticketId, current }: { ticketId: string; current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [open, setOpen] = useState(false);

  async function updateStatus(newStatus: string) {
    setOpen(false);
    if (newStatus === status) return;
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setStatus(newStatus);
      router.refresh();
    } else {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}>
        <Badge label={status.replace(/_/g, " ")} variant={statusVariant(status) as "blue" | "yellow" | "orange" | "green" | "gray"} className="cursor-pointer hover:opacity-80" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          {statuses.map((s) => (
            <button key={s} onClick={() => updateStatus(s)}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg">
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
