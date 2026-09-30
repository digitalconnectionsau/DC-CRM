import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDate, expiryLabel, clientDisplayName } from "@/lib/utils";
import { PlusIcon } from "@heroicons/react/24/outline";
import { ClientContactsPanel } from "@/components/clients/ClientContactsPanel";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      domains: { orderBy: { name: "asc" } },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });

  if (!client) notFound();

  const displayName = clientDisplayName(client);

  return (
    <DashboardLayout>
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-2">
        <Link href="/clients" className="text-sm text-gray-400 hover:text-gray-600">Clients</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold">{displayName}</h1>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Company + Primary Contact */}
          <div className="space-y-4">
            {/* Company */}
            <Card>
              <CardHeader><h2 className="font-medium">Company</h2></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-gray-500">Name:</span> {client.companyName ?? "—"}</div>
                <div><span className="text-gray-500">Website:</span>{" "}
                  {client.website ? <a href={client.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{client.website}</a> : "—"}
                </div>
                {client.quickbooksId && <div><span className="text-gray-500">QB ID:</span> {client.quickbooksId}</div>}
              </CardContent>
            </Card>

            {/* Primary contact */}
            <Card>
              <CardHeader><h2 className="font-medium">Primary Contact</h2></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-gray-500">Name:</span> {client.firstName} {client.lastName}</div>
                <div><span className="text-gray-500">Email:</span> {client.email}</div>
                <div><span className="text-gray-500">Phone:</span> {client.phone ?? "—"}</div>
                <div><span className="text-gray-500">Mobile:</span> {client.mobile ?? "—"}</div>
                <div className="pt-2 text-gray-400 text-xs">Added {formatDate(client.createdAt)}</div>
              </CardContent>
            </Card>

            {/* Billing address */}
            <Card>
              <CardHeader><h2 className="font-medium">Billing Address</h2></CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-0.5">
                {client.billingAddress1 ? (
                  <>
                    <div>{client.billingAddress1}</div>
                    {client.billingAddress2 && <div>{client.billingAddress2}</div>}
                    <div>{[client.billingCity, client.billingState, client.billingPostcode].filter(Boolean).join(" ")}</div>
                    <div>{client.billingCountry}</div>
                  </>
                ) : (
                  <span className="text-gray-400">No billing address on file.</span>
                )}
              </CardContent>
            </Card>

            {/* Additional contacts */}
            <Card>
              <CardHeader><h2 className="font-medium">Additional Contacts</h2></CardHeader>
              <CardContent>
                <ClientContactsPanel clientId={client.id} initialContacts={client.contacts} />
              </CardContent>
            </Card>

            {client.notes && (
              <Card>
                <CardHeader><h2 className="font-medium">Notes</h2></CardHeader>
                <CardContent><p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p></CardContent>
              </Card>
            )}
          </div>

          {/* Domains + Tickets */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">Domains ({client.domains.length})</h2>
                  <Link href={`/domains/new?clientId=${client.id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                    <PlusIcon className="w-3 h-3" /> Add domain
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-2 text-left font-medium text-gray-500">Domain</th>
                      <th className="px-6 py-2 text-left font-medium text-gray-500">Expires</th>
                      <th className="px-6 py-2 text-left font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.domains.map((d) => (
                      <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-2"><Link href={`/domains/${d.id}`} className="text-brand-600 hover:underline">{d.name}</Link></td>
                        <td className="px-6 py-2 text-gray-500">{expiryLabel(d.expiresAt)}</td>
                        <td className="px-6 py-2"><Badge label={d.status} variant={d.status === "ACTIVE" ? "green" : d.status === "EXPIRING_SOON" ? "yellow" : "red"} /></td>
                      </tr>
                    ))}
                    {client.domains.length === 0 && <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-400">No domains</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">Recent Tickets</h2>
                  <Link href={`/tickets/new?clientId=${client.id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                    <PlusIcon className="w-3 h-3" /> New ticket
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-2 text-left font-medium text-gray-500">Title</th>
                      <th className="px-6 py-2 text-left font-medium text-gray-500">Status</th>
                      <th className="px-6 py-2 text-left font-medium text-gray-500">Priority</th>
                      <th className="px-6 py-2 text-left font-medium text-gray-500">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.tickets.map((t) => (
                      <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-2"><Link href={`/tickets/${t.id}`} className="text-brand-600 hover:underline">{t.title}</Link></td>
                        <td className="px-6 py-2"><Badge label={t.status.replace(/_/g, " ")} variant="blue" /></td>
                        <td className="px-6 py-2"><Badge label={t.priority} variant={t.priority === "URGENT" ? "red" : t.priority === "HIGH" ? "orange" : t.priority === "MEDIUM" ? "yellow" : "gray"} /></td>
                        <td className="px-6 py-2 text-gray-400">{formatDate(t.createdAt)}</td>
                      </tr>
                    ))}
                    {client.tickets.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">No tickets</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
