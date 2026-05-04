import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  UsersIcon,
  GlobeAltIcon,
  TicketIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { formatDate, expiryLabel } from "@/lib/utils";
import { addDays } from "date-fns";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [totalClients, totalDomains, openTickets, expiringDomains, recentTickets] =
    await Promise.all([
      prisma.client.count(),
      prisma.domain.count(),
      prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.domain.findMany({
        where: {
          expiresAt: { lte: addDays(new Date(), 30), gte: new Date() },
          status: "ACTIVE",
        },
        include: { client: true },
        orderBy: { expiresAt: "asc" },
        take: 5,
      }),
      prisma.ticket.findMany({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        include: { client: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <DashboardLayout>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Clients" value={totalClients} icon={UsersIcon} />
          <StatCard label="Total Domains" value={totalDomains} icon={GlobeAltIcon} iconColor="text-green-600" />
          <StatCard label="Open Tickets" value={openTickets} icon={TicketIcon} iconColor="text-yellow-600" />
          <StatCard
            label="Expiring (30d)"
            value={expiringDomains.length}
            icon={ExclamationTriangleIcon}
            iconColor="text-red-500"
            subtext="domains expiring soon"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">Domains Expiring Soon</h2>
            </CardHeader>
            <CardContent className="p-0">
              {expiringDomains.length === 0 ? (
                <p className="text-sm text-gray-400 px-6 py-4">No domains expiring in the next 30 days.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {expiringDomains.map((d) => (
                      <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <Link href={`/domains/${d.id}`} className="font-medium text-brand-600 hover:underline">
                            {d.name}
                          </Link>
                          <div className="text-xs text-gray-400">{d.client.name}</div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Badge label={expiryLabel(d.expiresAt)} variant="yellow" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-900">Recent Open Tickets</h2>
            </CardHeader>
            <CardContent className="p-0">
              {recentTickets.length === 0 ? (
                <p className="text-sm text-gray-400 px-6 py-4">No open tickets.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {recentTickets.map((t) => (
                      <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <Link href={`/tickets/${t.id}`} className="font-medium text-brand-600 hover:underline">
                            {t.title}
                          </Link>
                          <div className="text-xs text-gray-400">{t.client.name}</div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Badge
                            label={t.priority}
                            variant={
                              t.priority === "URGENT" ? "red" :
                              t.priority === "HIGH" ? "orange" :
                              t.priority === "MEDIUM" ? "yellow" : "gray"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
