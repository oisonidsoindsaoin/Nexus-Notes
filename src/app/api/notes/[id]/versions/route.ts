import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { noteVersions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await db
      .select()
      .from(noteVersions)
      .where(eq(noteVersions.noteId, id))
      .orderBy(desc(noteVersions.createdAt))
      .limit(50);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET versions error:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}
