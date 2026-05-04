import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { PlusIcon } from "@heroicons/react/24/outline";

const statusVariant = (s: string) => {
  if (s === "OPEN") return "blue";
  if (s === "IN_PROGRESS") return "yellow";
  if (s === "WAITING_ON_CLIENT") return "orange";
  if (s === "RESOLVED") return "green";
  return "gray";
};

const priorityVariant = (p: string) => {
  if (p === "URGENT") return "red";
  if (p === "HIGH") return "orange";
  if (p === "MEDIUM") return "yellow";
  return "gray";
};

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    include: { client: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <DashboardLayout>
      <Header title="Tickets" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
          <Link href="/tickets/new" className="inline-flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            <PlusIcon className="w-4 h-4" /> New Ticket
          </Link>
        </div>
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Title</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Client</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Priority</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link href={`/tickets/${t.id}`} className="font-medium text-brand-600 hover:underline">{t.title}</Link>
                  </td>
                  <td className="px-6 py-3">
                    <Link href={`/clients/${t.clientId}`} className="text-gray-600 hover:underline">{t.client.name}</Link>
                  </td>
                  <td className="px-6 py-3">
                    <Badge label={t.status.replace(/_/g, " ")} variant={statusVariant(t.status) as "blue" | "yellow" | "orange" | "green" | "gray"} />
                  </td>
                  <td className="px-6 py-3">
                    <Badge label={t.priority} variant={priorityVariant(t.priority) as "red" | "orange" | "yellow" | "gray"} />
                  </td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No tickets yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
