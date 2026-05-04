"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Client created");
      router.push("/clients");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to create client");
    }
  }

  return (
    <DashboardLayout>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">New Client</h1>
      </div>
      <div className="p-6 max-w-lg">
        <Card>
          <CardHeader><h2 className="font-medium">Client Details</h2></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "Full Name *", field: "name", type: "text", required: true },
                { label: "Email *", field: "email", type: "email", required: true },
                { label: "Phone", field: "phone", type: "tel", required: false },
                { label: "Company", field: "company", type: "text", required: false },
              ].map(({ label, field, type, required }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={(form as Record<string, string>)[field]}
                    onChange={(e) => set(field, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {loading ? "Creating..." : "Create Client"}
                </button>
                <Link href="/clients" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                  Cancel
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
