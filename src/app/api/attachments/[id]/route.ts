import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db.select().from(attachments).where(eq(attachments.id, id));
    if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const att = result[0];
    const buffer = Buffer.from(att.data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": att.mimeType,
        "Content-Disposition": `inline; filename="${att.filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET attachment error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(attachments).where(eq(attachments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE attachment error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
