"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Link from "next/link";

const AUSTRALIAN_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

type Form = {
  firstName: string; lastName: string; email: string; phone: string; mobile: string;
  companyName: string; website: string;
  billingAddress1: string; billingAddress2: string; billingCity: string;
  billingState: string; billingPostcode: string; billingCountry: string;
  notes: string;
};

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    firstName: "", lastName: "", email: "", phone: "", mobile: "",
    companyName: "", website: "",
    billingAddress1: "", billingAddress2: "", billingCity: "",
    billingState: "", billingPostcode: "", billingCountry: "Australia",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  function set(field: keyof Form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function inp(label: string, key: keyof Form, opts?: { type?: string; required?: boolean; placeholder?: string }) {
    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={opts?.type ?? "text"}
          required={opts?.required}
          placeholder={opts?.placeholder}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    );
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
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-2">
        <Link href="/clients" className="text-sm text-gray-400 hover:text-gray-600">Clients</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold">New Client</h1>
      </div>
      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><h2 className="font-medium">Company Details</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {inp("Company Name", "companyName", { placeholder: "Acme Pty Ltd" })}
                {inp("Website", "website", { type: "url", placeholder: "https://example.com" })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-medium">Primary Contact</h2></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {inp("First Name", "firstName")}
                {inp("Last Name", "lastName")}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {inp("Email *", "email", { type: "email", required: true })}
                {inp("Phone", "phone", { type: "tel" })}
              </div>
              {inp("Mobile", "mobile", { type: "tel" })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-medium">Billing Address</h2></CardHeader>
            <CardContent className="space-y-4">
              {inp("Address Line 1", "billingAddress1", { placeholder: "123 Main Street" })}
              {inp("Address Line 2", "billingAddress2", { placeholder: "Suite 4" })}
              <div className="grid grid-cols-3 gap-4">
                {inp("City / Suburb", "billingCity")}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={form.billingState}
                    onChange={(e) => set("billingState", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">—</option>
                    {AUSTRALIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {inp("Postcode", "billingPostcode")}
              </div>
              {inp("Country", "billingCountry")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="font-medium">Notes</h2></CardHeader>
            <CardContent>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Internal notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Client"}
            </button>
            <Link href="/clients" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
