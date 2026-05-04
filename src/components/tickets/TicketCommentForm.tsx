"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, internal }),
    });
    setLoading(false);
    if (res.ok) {
      setContent("");
      setInternal(false);
      router.refresh();
    } else {
      toast.error("Failed to add comment");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="rounded border-gray-300 text-brand-600" />
          Internal note
        </label>
        <button type="submit" disabled={loading || !content.trim()} className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {loading ? "Posting..." : "Add Comment"}
        </button>
      </div>
    </form>
  );
}
