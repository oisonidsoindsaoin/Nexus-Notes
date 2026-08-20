import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Set GEMINI_API_KEY environment variable." },
        { status: 503 }
      );
    }

    const email = req.headers.get("x-user-email") || "";
    const body = await req.json();
    const { message, conversationId, noteContext, selectedText } = body;

    let convoId = conversationId;

    if (!convoId) {
      const newConvo = await db
        .insert(aiConversations)
        .values({ userEmail: email, title: message.substring(0, 60) || "New Conversation" })
        .returning();
      convoId = newConvo[0].id;
    }

    await db.insert(aiMessages).values({
      conversationId: convoId,
      role: "user",
      content: message,
    });

    const history = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, convoId))
      .orderBy(aiMessages.createdAt);

    const systemInstruction = buildSystemPrompt(noteContext, selectedText);

    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiBody = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: "AI service returned an error. Please try again." },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const aiContent =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response. Please try again.";

    const savedMsg = await db
      .insert(aiMessages)
      .values({
        conversationId: convoId,
        role: "assistant",
        content: aiContent,
      })
      .returning();

    if (!conversationId) {
      await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.id, convoId));
    }

    return NextResponse.json({
      message: savedMsg[0],
      conversationId: convoId,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(noteContext?: string, selectedText?: string): string {
  let prompt = `You are a friendly, warm AI assistant built into a notes app called "Nexus Notes". You help people with anything they need — writing, ideas, planning, studying, coding, or just chatting. Be natural and conversational, like a helpful friend. Use markdown when it helps readability. Follow the user's instructions carefully.`;

  if (noteContext) {
    prompt += `\n\nThe user is looking at this note:\n---\n${noteContext}\n---\nRefer to it when they ask about "this note" or similar.`;
  }

  if (selectedText) {
    prompt += `\n\nThe user selected this text:\n---\n${selectedText}\n---\nFocus on this when they ask to improve, rewrite, explain, etc.`;
  }

  return prompt;
}
