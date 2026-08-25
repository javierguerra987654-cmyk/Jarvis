import { z } from "zod";
import { getJarvisModel, getJarvisSystemPrompt, getOpenAI } from "@/lib/jarvis-core";
import { runMemoryTool } from "@/lib/memory-tool";
import { integrationToolDefinitions, runIntegrationTool } from "@/lib/integration-tools";
import { getSessionUserId } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";

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

const memoryToolDefinition = {
  type: "function" as const,
  name: "memory",
  description: "Busca o guarda memoria persistente. Usa search para recuperar recuerdos relevantes y save solo cuando el usuario pida recordar, guardar o memorizar algo.",
  strict: true,
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      action: { type: "string", enum: ["search", "save"] },
      query: { type: ["string", "null"], description: "Texto para buscar en memoria." },
      content: { type: ["string", "null"], description: "Contenido que se quiere guardar." },
      category: { type: ["string", "null"], enum: ["fact", "preference", "goal", "context", null] },
      importance: { type: ["number", "null"], description: "Importancia entre 0 y 1." },
    },
    required: ["action", "query", "content", "category", "importance"],
  },
} as const;

const tools = [memoryToolDefinition, ...integrationToolDefinitions];

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return Response.json({ error: "Sesión JARVIS no válida o ausente.", code: "SESSION_REQUIRED", requestId }, { status: 401 });
    }

    const rate = enforceRateLimit(`jarvis:${userId}`, 20, 60_000);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo de nuevo en un momento.", requestId }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) },
      });
    }

    const body = RequestSchema.parse(await request.json());
    const client = getOpenAI();
    const conversation = body.history
      .map((item) => `${item.role === "user" ? "USER" : "ASSISTANT"}: ${item.content}`)
      .concat(`USER: ${body.message}`)
      .join("\n\n");

    const first = await client.responses.create({
      model: getJarvisModel(),
      instructions: getJarvisSystemPrompt(),
      input: conversation,
      tools,
    });

    const calls = (first.output ?? []).filter((item: { type?: string }) => item.type === "function_call");
    const outputs: Array<{ type: "function_call_output"; call_id: string; output: string }> = [];

    for (const call of calls) {
      const typedCall = call as { name?: string; arguments?: string; call_id?: string };
      if (!typedCall.name || !typedCall.call_id) continue;
      try {
        const args = JSON.parse(typedCall.arguments || "{}");
        let result: unknown;
        if (typedCall.name === "memory") {
          result = await runMemoryTool(args, { userId, requestId });
        } else if (integrationToolDefinitions.some((tool) => tool.name === typedCall.name)) {
          result = await runIntegrationTool(typedCall.name, args);
        } else {
          throw new Error(`Tool no permitida: ${typedCall.name}`);
        }
        outputs.push({ type: "function_call_output", call_id: typedCall.call_id, output: JSON.stringify(result) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error ejecutando herramienta.";
        outputs.push({ type: "function_call_output", call_id: typedCall.call_id, output: JSON.stringify({ error: message }) });
      }
    }

    const stream = await client.responses.create({
      model: getJarvisModel(),
      instructions: getJarvisSystemPrompt(),
      previous_response_id: first.id,
      input: outputs,
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
          controller.enqueue(encoder.encode(sse({ error: message, requestId })));
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
        "X-Request-Id": requestId,
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? "Solicitud no válida."
      : error instanceof Error
        ? error.message
        : "Error interno.";

    return Response.json({ error: message, requestId }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
