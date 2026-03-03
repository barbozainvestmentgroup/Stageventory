import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPropertySchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "clients:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPropertySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { clientId, address, city, state, zip, sqft, bedrooms, bathrooms, listingPrice, mlsNumber, notes } = parsed.data;

  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const property = await prisma.property.create({
    data: {
      clientId,
      address,
      city,
      state: state || "FL",
      zip,
      sqft: sqft || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      listingPrice: listingPrice || null,
      mlsNumber: mlsNumber || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(property, { status: 201 });
}
