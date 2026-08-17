import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, noteVersions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.select().from(notes).where(eq(notes.id, id));
    if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("GET /api/notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Save version if content is changing
    if (body.content !== undefined || body.title !== undefined) {
      const existing = await db.select().from(notes).where(eq(notes.id, id));
      if (existing.length && (existing[0].content !== body.content || existing[0].title !== body.title)) {
        await db.insert(noteVersions).values({
          noteId: id,
          title: existing[0].title,
          content: existing[0].content || "",
        });
      }
    }

    const result = await db
      .update(notes)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, id))
      .returning();

    if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("PATCH /api/notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(notes).where(eq(notes.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
