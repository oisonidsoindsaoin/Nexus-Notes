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

    const body = await req.json();
    const { message, conversationId, noteContext, selectedText } = body;

    let convoId = conversationId;

    // Create conversation if needed
    if (!convoId) {
      const newConvo = await db
        .insert(aiConversations)
        .values({ title: message.substring(0, 60) || "New Conversation" })
        .returning();
      convoId = newConvo[0].id;
    }

    // Save user message
    await db.insert(aiMessages).values({
      conversationId: convoId,
      role: "user",
      content: message,
    });

    // Get conversation history
    const history = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, convoId))
      .orderBy(aiMessages.createdAt);

    // Build Gemini request
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

    // Save assistant message
    const savedMsg = await db
      .insert(aiMessages)
      .values({
        conversationId: convoId,
        role: "assistant",
        content: aiContent,
      })
      .returning();

    // Update conversation title if it's a new one
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
  let prompt = `You are an intelligent AI assistant integrated into a premium notes application called "Nexus Notes". You help users with:
- Writing and improving content
- Answering questions
- Brainstorming and planning
- Creating study materials
- Summarizing and explaining
- Coding help
- Research and analysis

Be concise, helpful, and conversational. Use markdown formatting when it improves readability. 
Follow the user's instructions carefully - if they ask you to wait before responding with content, respect that.
Be direct and avoid unnecessary preamble.`;

  if (noteContext) {
    prompt += `\n\nThe user is currently viewing a note with this content:\n---\n${noteContext}\n---\nYou can reference this content when the user asks about "this note" or similar phrases.`;
  }

  if (selectedText) {
    prompt += `\n\nThe user has selected this specific text:\n---\n${selectedText}\n---\nFocus on this selected text when the user asks to improve, rewrite, explain, etc.`;
  }

  return prompt;
}
