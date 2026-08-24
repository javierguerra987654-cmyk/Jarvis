import { z } from "zod";
import { getJarvisModel, getJarvisSystemPrompt, getOpenAI } from "@/lib/jarvis-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(12000),
  })).max(30).default([]),
});

function sse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    const client = getOpenAI();
    const conversation = body.history
      .map((item) => `${item.role === "user" ? "USER" : "ASSISTANT"}: ${item.content}`)
      .concat(`USER: ${body.message}`)
      .join("\n\n");

    const stream = await client.responses.create({
      model: getJarvisModel(),
      instructions: getJarvisSystemPrompt(),
      input: conversation,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
              controller.enqueue(encoder.encode(sse({ delta: event.delta })));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Error de streaming.";
          controller.enqueue(encoder.encode(sse({ error: message })));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Solicitud no válida."
      : error instanceof Error
        ? error.message
        : "Error interno.";

    return Response.json({ error: message }, { status: 400 });
  }
}
