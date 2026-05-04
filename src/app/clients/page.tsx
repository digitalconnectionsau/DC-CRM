import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { PlusIcon } from "@heroicons/react/24/outline";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { domains: true, tickets: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <DashboardLayout>
      <Header title="Clients" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Add Client
          </Link>
        </div>
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Company</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Domains</th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">Tickets</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium text-brand-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{c.email}</td>
                  <td className="px-6 py-3 text-gray-500">{c.company ?? "—"}</td>
                  <td className="px-6 py-3 text-center">{c._count.domains}</td>
                  <td className="px-6 py-3 text-center">{c._count.tickets}</td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No clients yet. Add your first client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
