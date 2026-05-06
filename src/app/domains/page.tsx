import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { expiryLabel, daysUntilExpiry } from "@/lib/utils";
import { PlusIcon } from "@heroicons/react/24/outline";

export default async function DomainsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const domains = await prisma.domain.findMany({
    include: { client: true },
    orderBy: { name: "asc" },
  });


  function statusVariant(status: string) {
    if (status === "ACTIVE") return "green";
    if (status === "EXPIRING_SOON") return "yellow";
    if (status === "EXPIRED") return "red";
    return "gray";
  }

  return (
    <DashboardLayout>
      <Header title="Domains" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">{domains.length} domain{domains.length !== 1 ? "s" : ""}</p>
          <Link href="/domains/new" className="inline-flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            <PlusIcon className="w-4 h-4" /> Add Domain
          </Link>
        </div>
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Domain</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Client</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Registrar</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Expires</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Auto Renew</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => {
                const days = daysUntilExpiry(d.expiresAt);
                return (
                  <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link href={`/domains/${d.id}`} className="font-medium text-brand-600 hover:underline">{d.name}</Link>
                    </td>
                    <td className="px-6 py-3">
                      {d.client ? (
                        <Link href={`/clients/${d.clientId}`} className="text-gray-600 hover:underline">{d.client.name}</Link>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{d.registrar ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className={days !== null && days <= 30 ? "text-red-600 font-medium" : "text-gray-500"}>
                        {expiryLabel(d.expiresAt)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <Badge label={d.autoRenew ? "Yes" : "No"} variant={d.autoRenew ? "green" : "gray"} />
                    </td>
                    <td className="px-6 py-3">
                      <Badge label={d.status} variant={statusVariant(d.status) as "green" | "yellow" | "red" | "gray"} />
                    </td>
                  </tr>
                );
              })}
              {domains.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No domains yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
