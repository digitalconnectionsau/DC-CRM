import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { TicketCommentForm } from "@/components/tickets/TicketCommentForm";
import { TicketStatusSelect } from "@/components/tickets/TicketStatusSelect";

const statusVariant = (s: string) => {
  if (s === "OPEN") return "blue";
  if (s === "IN_PROGRESS") return "yellow";
  if (s === "WAITING_ON_CLIENT") return "orange";
  if (s === "RESOLVED") return "green";
  return "gray";
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      client: true,
      comments: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) notFound();

  return (
    <DashboardLayout>
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-2">
        <Link href="/tickets" className="text-sm text-gray-400 hover:text-gray-600">Tickets</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold">{ticket.title}</h1>
      </div>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><h2 className="font-medium">Ticket Info</h2></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <TicketStatusSelect ticketId={ticket.id} current={ticket.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Priority</span>
                <Badge label={ticket.priority} variant={ticket.priority === "URGENT" ? "red" : ticket.priority === "HIGH" ? "orange" : ticket.priority === "MEDIUM" ? "yellow" : "gray"} />
              </div>
              <div><span className="text-gray-500">Client:</span>{" "}
                <Link href={`/clients/${ticket.clientId}`} className="text-brand-600 hover:underline">{ticket.client.name}</Link>
              </div>
              <div><span className="text-gray-500">Created:</span> {formatDate(ticket.createdAt)}</div>
              <div><span className="text-gray-500">Updated:</span> {formatDate(ticket.updatedAt)}</div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><h2 className="font-medium">Description</h2></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><h2 className="font-medium">Comments ({ticket.comments.length})</h2></CardHeader>
          <CardContent className="space-y-4">
            {ticket.comments.map((c) => (
              <div key={c.id} className={`rounded-lg p-4 text-sm ${c.internal ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50 border border-gray-200"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{c.author.name}</span>
                  <div className="flex items-center gap-2">
                    {c.internal && <Badge label="Internal" variant="yellow" />}
                    <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
            {ticket.comments.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
            <TicketCommentForm ticketId={ticket.id} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
