import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDate, expiryLabel } from "@/lib/utils";

export default async function DomainDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const domain = await prisma.domain.findUnique({
    where: { id: params.id },
    include: { client: true, dnsRecords: { orderBy: [{ type: "asc" }, { name: "asc" }] } },
  });

  if (!domain) notFound();

  const statusVariant = (s: string) =>
    s === "ACTIVE" ? "green" : s === "EXPIRING_SOON" ? "yellow" : s === "EXPIRED" ? "red" : "gray";

  return (
    <DashboardLayout>
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-2">
        <Link href="/domains" className="text-sm text-gray-400 hover:text-gray-600">Domains</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold font-mono">{domain.name}</h1>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><h2 className="font-medium">Details</h2></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-gray-500">Client:</span>{" "}
                <Link href={`/clients/${domain.clientId}`} className="text-brand-600 hover:underline">{domain.client.name}</Link>
              </div>
              <div><span className="text-gray-500">Registrar:</span> {domain.registrar ?? "—"}</div>
              <div><span className="text-gray-500">Expires:</span> {expiryLabel(domain.expiresAt)}</div>
              <div><span className="text-gray-500">Auto Renew:</span> <Badge label={domain.autoRenew ? "Yes" : "No"} variant={domain.autoRenew ? "green" : "gray"} /></div>
              <div><span className="text-gray-500">Status:</span> <Badge label={domain.status} variant={statusVariant(domain.status) as "green" | "yellow" | "red" | "gray"} /></div>
              {domain.nameservers.length > 0 && (
                <div>
                  <span className="text-gray-500">Nameservers:</span>
                  <ul className="mt-1 space-y-0.5">
                    {domain.nameservers.map((ns) => <li key={ns} className="font-mono text-xs text-gray-600">{ns}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-medium">DNS Records ({domain.dnsRecords.length})</h2>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm font-mono">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 font-sans">Type</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 font-sans">Name</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 font-sans">Value</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500 font-sans">TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.dnsRecords.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2"><Badge label={r.type} variant="blue" /></td>
                      <td className="px-4 py-2 text-gray-700">{r.name}</td>
                      <td className="px-4 py-2 text-gray-600 max-w-xs truncate">{r.value}</td>
                      <td className="px-4 py-2 text-right text-gray-400 font-sans text-xs">{r.ttl}</td>
                    </tr>
                  ))}
                  {domain.dnsRecords.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 font-sans">No DNS records. Sync from WHM or add manually.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
