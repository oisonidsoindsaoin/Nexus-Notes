import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select()
      .from(aiConversations)
      .orderBy(desc(aiConversations.updatedAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET conversations error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
