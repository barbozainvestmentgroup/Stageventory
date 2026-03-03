import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("photos") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "inventory", params.id);
  await mkdir(uploadDir, { recursive: true });

  const newPhotos: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > 10 * 1024 * 1024) continue; // 10MB max

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(filepath, bytes);

    const publicPath = `/uploads/inventory/${params.id}/${filename}`;
    newPhotos.push(publicPath);
  }

  const updatedItem = await prisma.inventoryItem.update({
    where: { id: params.id },
    data: {
      photos: [...item.photos, ...newPhotos],
    },
  });

  return NextResponse.json({ photos: updatedItem.photos });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, "inventory:write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { photoUrl } = await req.json();

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const updatedPhotos = item.photos.filter((p) => p !== photoUrl);

  const updatedItem = await prisma.inventoryItem.update({
    where: { id: params.id },
    data: { photos: updatedPhotos },
  });

  return NextResponse.json({ photos: updatedItem.photos });
}
