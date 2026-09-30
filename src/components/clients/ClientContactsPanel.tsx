"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  role: string | null;
  isPrimary: boolean;
}

const empty = { firstName: "", lastName: "", email: "", phone: "", mobile: "", role: "", isPrimary: false };

export function ClientContactsPanel({ clientId, initialContacts }: { clientId: string; initialContacts: Contact[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function set(field: keyof typeof empty, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const c = await res.json();
      setContacts((prev) => [...prev, c]);
      setForm(empty);
      setAdding(false);
      toast.success("Contact added");
      router.refresh();
    } else {
      toast.error("Failed to add contact");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this contact?")) return;
    const res = await fetch(`/api/clients/${clientId}/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contact removed");
    } else {
      toast.error("Failed to remove contact");
    }
  }

  return (
    <div className="space-y-3">
      {contacts.length === 0 && !adding && (
        <p className="text-sm text-gray-400">No additional contacts.</p>
      )}

      {contacts.map((c) => (
        <div key={c.id} className="flex items-start justify-between rounded-lg border border-gray-200 px-4 py-3 group">
          <div className="space-y-0.5 text-sm">
            <div className="font-medium text-gray-800">
              {c.firstName} {c.lastName}
              {c.isPrimary && <span className="ml-2 text-xs text-brand-600 font-normal">Primary</span>}
              {c.role && <span className="ml-2 text-xs text-gray-400">{c.role}</span>}
            </div>
            {c.email && <div className="text-gray-500">{c.email}</div>}
            {c.phone && <div className="text-gray-500">P: {c.phone}</div>}
            {c.mobile && <div className="text-gray-500">M: {c.mobile}</div>}
          </div>
          <button
            onClick={() => handleDelete(c.id)}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={handleAdd} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            {(["firstName", "lastName"] as const).map((f) => (
              <input key={f} placeholder={f === "firstName" ? "First name *" : "Last name *"} required value={form[f] as string}
                onChange={(e) => set(f, e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input placeholder="Role (e.g. Billing, Director)" value={form.role as string} onChange={(e) => set("role", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input placeholder="Mobile" type="tel" value={form.mobile} onChange={(e) => set("mobile", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Saving..." : "Add Contact"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setForm(empty); }}
              className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <PlusIcon className="w-4 h-4" /> Add contact
        </button>
      )}
    </div>
  );
}
