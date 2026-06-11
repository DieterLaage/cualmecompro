import { SYSTEM_PROMPT } from "./prompt.js";
import { MODEL, RATE_LIMIT, RATE_WINDOW, PRICING } from "./constants.js";

// --- Rate limiting ---
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimit.get(ip) || { count: 0, start: now };
  if (now - record.start > RATE_WINDOW) {
    record.count = 1;
    record.start = now;
  } else {
    record.count++;
  }
  rateLimit.set(ip, record);
  return record.count <= RATE_LIMIT;
}

function sseEvent(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// --- Main handler (Netlify Functions v2) ---
export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || context.ip || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta en 1 minuto." }), {
      status: 429,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  let profileText, answers;
  try {
    const body = await req.json();
    profileText = body.profileText;
    answers = body.answers;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  if (!profileText) {
    return new Response(JSON.stringify({ error: "Falta profileText" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
  if (profileText.length > 2000) {
    return new Response(JSON.stringify({ error: "Input demasiado largo" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key no configurada" }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  // --- Stream response ---
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    let fullText = "";
    const startTime = Date.now();
    let usage = { input: 0, output: 0, cache_read: 0 };

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "prompt-caching-2024-07-31",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4000,
          stream: true,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `Genera un ranking de autos para este usuario. El presupuesto máximo es ABSOLUTO, no incluyas ningún auto que lo supere:\n\n${profileText}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        await writer.write(encoder.encode(sseEvent({ type: "error", message: `Anthropic ${res.status}: ${errText.substring(0, 200)}` })));
        await writer.close();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              const text = event.delta.text;
              fullText += text;
              await writer.write(encoder.encode(sseEvent({ type: "chunk", text })));
            }

            if (event.type === "message_start" && event.message?.usage) {
              usage.input = event.message.usage.input_tokens || 0;
              usage.cache_read = event.message.usage.cache_read_input_tokens || 0;
            }
            if (event.type === "message_delta" && event.usage) {
              usage.output = event.usage.output_tokens || 0;
            }
          } catch (e) {
            // Skip unparseable lines
          }
        }
      }

      // Enviar metadata al frontend para que loguee
      const match = fullText.match(/\{[\s\S]*\}/);
      const elapsedMs = Date.now() - startTime;
      const costoUsd =
        ((usage.input - usage.cache_read) * PRICING.input / 1_000_000) +
        (usage.cache_read * PRICING.cache_read / 1_000_000) +
        (usage.output * PRICING.output / 1_000_000);

      await writer.write(encoder.encode(sseEvent({
        type: "meta",
        modelo: MODEL,
        tiempo_ms: elapsedMs,
        tokens_input: usage.input,
        tokens_output: usage.output,
        tokens_cache: usage.cache_read,
        precio_usd: parseFloat(costoUsd.toFixed(6)),
      })));

      await writer.write(encoder.encode(sseEvent({ type: "done" })));

      // Enviar done AL FINAL, dentro del IIFE
      await writer.write(encoder.encode(sseEvent({ type: "done" })));

    } catch (e) {
      console.error("Stream error:", e);
      try {
        await writer.write(encoder.encode(sseEvent({ type: "error", message: e.message })));
      } catch (_) {}
    } finally {
      try {
        await writer.close();
      } catch (_) {}
    }
  })();
  
  return new Response(readable, {
    status: 200,
    headers: {
      ...corsHeaders(),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const config = {
  path: "/.netlify/functions/ranking",
};
