import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Priority } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, clientId, priority } = body;

  if (!title || !description || !clientId) {
    return NextResponse.json({ error: "Title, description and client are required" }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: { title, description, clientId, priority: (priority as Priority) ?? "MEDIUM" },
  });
  return NextResponse.json(ticket, { status: 201 });
}
