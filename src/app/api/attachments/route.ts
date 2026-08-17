import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const noteId = new URL(req.url).searchParams.get("noteId");
    if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });

    const result = await db
      .select({
        id: attachments.id,
        noteId: attachments.noteId,
        filename: attachments.filename,
        mimeType: attachments.mimeType,
        size: attachments.size,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(eq(attachments.noteId, noteId));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET attachments error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const noteId = formData.get("noteId") as string;

    if (!file || !noteId) {
      return NextResponse.json({ error: "file and noteId required" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const result = await db
      .insert(attachments)
      .values({
        noteId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64,
      })
      .returning({
        id: attachments.id,
        noteId: attachments.noteId,
        filename: attachments.filename,
        mimeType: attachments.mimeType,
        size: attachments.size,
        createdAt: attachments.createdAt,
      });

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("POST attachment error:", error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}
