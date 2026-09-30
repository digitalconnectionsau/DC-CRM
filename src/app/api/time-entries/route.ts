import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.timeEntry.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      ticket: { select: { id: true, title: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ticketId, description, startTime, endTime, durationMinutes, billable, workType, userId } = body;

  if (!description || !startTime) {
    return NextResponse.json({ error: "description and startTime are required" }, { status: 400 });
  }

  // Only admins can log on behalf of another user
  const resolvedUserId =
    session.user.role === "ADMIN" && userId ? userId : session.user.id;

  const entry = await prisma.timeEntry.create({
    data: {
      userId: resolvedUserId,
      ticketId: ticketId || null,
      description,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      durationMinutes: durationMinutes ?? null,
      billable: billable ?? true,
      workType: workType ?? "REMOTE",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      ticket: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
