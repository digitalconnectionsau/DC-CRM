import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      ticket: { select: { id: true, title: true } },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the owner or an admin can edit
  if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { description, ticketId, startTime, endTime, durationMinutes, billable, workType } = body;

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(ticketId !== undefined && { ticketId: ticketId || null }),
      ...(startTime !== undefined && { startTime: new Date(startTime) }),
      ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(billable !== undefined && { billable }),
      ...(workType !== undefined && { workType }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      ticket: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
