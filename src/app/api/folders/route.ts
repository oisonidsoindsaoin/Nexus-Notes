import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const email = req.headers.get("x-user-email") || "";
    const result = await db.select().from(folders).where(eq(folders.userEmail, email)).orderBy(asc(folders.sortOrder));
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/folders error:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = req.headers.get("x-user-email") || "";
    const body = await req.json();
    const result = await db
      .insert(folders)
      .values({
        userEmail: email,
        name: body.name || "New Folder",
        color: body.color || "#6366f1",
        icon: body.icon || "📁",
        sortOrder: body.sortOrder || 0,
      })
      .returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("POST /api/folders error:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
