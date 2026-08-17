import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const msgs = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, id))
      .orderBy(asc(aiMessages.createdAt));
    return NextResponse.json(msgs);
  } catch (error) {
    console.error("GET conversation messages error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await db
      .update(aiConversations)
      .set({ title: body.title, updatedAt: new Date() })
      .where(eq(aiConversations.id, id))
      .returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("PATCH conversation error:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE conversation error:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
