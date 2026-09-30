import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { TimeEntryForm } from "@/components/time/TimeEntryForm";
import { TimeEntryList } from "@/components/time/TimeEntryList";

export default async function TimePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const [entries, users] = await Promise.all([
    prisma.timeEntry.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, title: true } },
      },
      orderBy: { startTime: "desc" },
      take: 200,
    }),
    isAdmin ? prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  // Totals for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEntries = entries.filter((e) => new Date(e.startTime) >= today);
  const todayMinutes = todayEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
  const billableMinutes = entries.reduce((s, e) => s + (e.billable ? (e.durationMinutes ?? 0) : 0), 0);
  const totalMinutes = entries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);

  function fmt(m: number) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h ${min}m`;
  }

  return (
    <DashboardLayout>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Time Tracking</h1>
      </div>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{fmt(todayMinutes)}</p>
              <p className="text-xs text-gray-500 mt-1">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-green-600">{fmt(billableMinutes)}</p>
              <p className="text-xs text-gray-500 mt-1">Billable (all time)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{fmt(totalMinutes)}</p>
              <p className="text-xs text-gray-500 mt-1">Total (all time)</p>
            </CardContent>
          </Card>
        </div>

        {/* Log time form */}
        <Card>
          <CardHeader><h2 className="font-medium">Log Time</h2></CardHeader>
          <CardContent>
            <TimeEntryForm isAdmin={isAdmin} users={users} />
          </CardContent>
        </Card>

        {/* Entries list */}
        <Card>
          <CardHeader><h2 className="font-medium">Recent Entries</h2></CardHeader>
          <CardContent>
            <TimeEntryList
              entries={entries.map((e) => ({ ...e, startTime: e.startTime.toISOString() }))}
              currentUserId={session.user.id}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
