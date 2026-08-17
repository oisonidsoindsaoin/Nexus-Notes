import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { desc, eq, and, or, ilike, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const folderId = url.searchParams.get("folderId");
    const tag = url.searchParams.get("tag");
    const favorites = url.searchParams.get("favorites");
    const pinned = url.searchParams.get("pinned");
    const deleted = url.searchParams.get("deleted");

    const conditions = [];

    if (deleted === "true") {
      conditions.push(eq(notes.isDeleted, true));
    } else {
      conditions.push(eq(notes.isDeleted, false));
    }

    if (folderId) {
      conditions.push(eq(notes.folderId, folderId));
    }

    if (favorites === "true") {
      conditions.push(eq(notes.isFavorite, true));
    }

    if (pinned === "true") {
      conditions.push(eq(notes.isPinned, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(notes.title, `%${search}%`),
          ilike(notes.content, `%${search}%`)
        )!
      );
    }

    if (tag) {
      conditions.push(sql`${notes.tags}::jsonb @> ${JSON.stringify([tag])}::jsonb`);
    }

    const result = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await db
      .insert(notes)
      .values({
        title: body.title || "Untitled",
        content: body.content || "",
        folderId: body.folderId || null,
        tags: body.tags || [],
        color: body.color || null,
        icon: body.icon || "📝",
        isFavorite: false,
        isPinned: false,
        isDeleted: false,
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
