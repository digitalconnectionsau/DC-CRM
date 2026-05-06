"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Link from "next/link";

function NewDomainForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    clientId: params.get("clientId") ?? "",
    registrar: "",
    expiresAt: "",
    autoRenew: true,
    nameservers: "",
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      ...form,
      nameservers: form.nameservers ? form.nameservers.split(",").map((s) => s.trim()).filter(Boolean) : [],
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Domain added");
      router.push("/domains");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to add domain");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name *</label>
        <input type="text" required placeholder="example.com.au" value={form.name} onChange={(e) => set("name", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
        <select required value={form.clientId} onChange={(e) => set("clientId", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Select client...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Registrar</label>
        <input type="text" placeholder="e.g. NetRegistry, Crazy Domains" value={form.registrar} onChange={(e) => set("registrar", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
        <input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nameservers (comma separated)</label>
        <input type="text" placeholder="ns1.example.com, ns2.example.com" value={form.nameservers} onChange={(e) => set("nameservers", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="autoRenew" checked={form.autoRenew} onChange={(e) => set("autoRenew", e.target.checked)}
          className="rounded border-gray-300 text-brand-600" />
        <label htmlFor="autoRenew" className="text-sm font-medium text-gray-700">Auto Renew</label>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {loading ? "Adding..." : "Add Domain"}
        </button>
        <Link href="/domains" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</Link>
      </div>
    </form>
  );
}

export default function NewDomainPage() {
  return (
    <DashboardLayout>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Add Domain</h1>
      </div>
      <div className="p-6 max-w-lg">
        <Card>
          <CardHeader><h2 className="font-medium">Domain Details</h2></CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
              <NewDomainForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
