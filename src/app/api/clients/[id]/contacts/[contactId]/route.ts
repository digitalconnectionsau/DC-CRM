import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { contactId } = await params;
  const body = await req.json();
  const contact = await prisma.clientContact.update({
    where: { id: contactId },
    data: {
      ...(body.firstName !== undefined && { firstName: body.firstName }),
      ...(body.lastName !== undefined && { lastName: body.lastName }),
      ...(body.email !== undefined && { email: body.email || null }),
      ...(body.phone !== undefined && { phone: body.phone || null }),
      ...(body.mobile !== undefined && { mobile: body.mobile || null }),
      ...(body.role !== undefined && { role: body.role || null }),
      ...(body.isPrimary !== undefined && { isPrimary: body.isPrimary }),
    },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; contactId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { contactId } = await params;
  await prisma.clientContact.delete({ where: { id: contactId } });
  return new NextResponse(null, { status: 204 });
}
