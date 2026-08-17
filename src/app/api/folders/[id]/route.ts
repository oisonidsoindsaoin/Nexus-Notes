import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await db
      .update(folders)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("PATCH /api/folders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(folders).where(eq(folders.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/folders/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
