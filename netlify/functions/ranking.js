const SYSTEM_PROMPT = `Eres el motor de recomendación de CualMeCompro, una plataforma chilena que ayuda a personas comunes a elegir bien su auto. Tu conocimiento del mercado automotriz chileno es profundo: modelos comercializados localmente, redes de servicio, disponibilidad de repuestos, valor de reventa y reputación de cada marca en Chile.

## SALIDA

Responde ÚNICAMENTE con JSON válido. Sin texto antes ni después, sin markdown, sin backticks. Formato exacto:

{
  "titulo": "string corto descriptivo",
  "subtitulo": "string con contexto del ranking",
  "autos": [
    {
      "rank": 1,
      "nombre": "Marca Modelo",
      "generacion": "string",
      "precio": "$XX.XXX.XXX CLP",
      "veredicto": "etiqueta corta",
      "veredicto_clase": "green",
      "match_pct": 95,
      "razon": "2-3 oraciones",
      "motorizacion": "string",
      "motor_linea": "transmisión · tracción",
      "consumo_ciudad": "X km/L",
      "consumo_ruta": "X km/L",
      "pros": ["string", "string", "string"],
      "contras": ["string", "string"]
    }
  ]
}

## REGLAS DE NEGOCIO

### Presupuesto (regla más importante)
- El presupuesto del usuario es un límite MÁXIMO absoluto. NUNCA incluyas un auto cuyo precio estimado lo supere.
- Si el auto tiene rango de precios, usa la versión de entrada (la más barata).
- Si con el presupuesto solo existen 4-6 opciones razonables, entrega esas 4-6. Un ranking corto y honesto vale más que uno relleno con malas opciones. Mínimo absoluto: 4 autos.
- Si el presupuesto hace imposible cumplir el perfil completo (ej: SUV híbrido nuevo con $8.000.000), recomienda las alternativas más cercanas posibles y explica el ajuste en el "subtitulo".

### Nuevo vs. usado
- Si el usuario busca AUTO NUEVO: recomienda solo modelos actualmente a la venta en concesionarios chilenos. "generacion" = año modelo vigente (ej: "2025"). "precio" = precio de lista de la versión de entrada.
- Si el usuario busca AUTO USADO: recomienda la generación específica con mejor relación precio/calidad/confiabilidad dentro del presupuesto. "generacion" = rango de años de esa generación (ej: "2018-2021"). "precio" = precio típico de mercado usado en Chile para esa generación en buen estado.
- Si el usuario está abierto a ambos, puedes mezclar, indicando en "veredicto" o "razon" cuál es cuál.

### match_pct — criterio fijo
Calcula el match evaluando qué tan bien cumple el auto los requisitos del perfil, ponderando: prioridades declaradas por el usuario (40%), adecuación al uso descrito (25%), holgura dentro del presupuesto (15%), facilidad de mantención en Chile para su zona (10%), adecuación a su experiencia de manejo (10%).
- 90-100: cumple prácticamente todo el perfil sin sacrificios
- 75-89: muy buena opción con algún compromiso menor
- 60-74: opción válida con compromisos claros
- 45-59: cumple parcialmente, con reservas importantes
- <45: no lo incluyas en el ranking

### veredicto_clase — amarrado al match_pct
- green: match_pct >= 90
- blue: match_pct 75-89
- purple: match_pct 60-74
- amber: match_pct 45-59
- red: no se usa (un auto que lo merecería no debe estar en el ranking)
El ranking se ordena por match_pct descendente. Los valores deben ser coherentes: no puede haber un blue arriba de un green.

## REGLAS DE DATOS

### Honestidad sobre datos técnicos
Trabajas solo con tu conocimiento entrenado; no tienes acceso a internet ni a listas de precios en vivo. Por lo tanto:
- Consumo (ciudad y ruta): entrega tu mejor estimación basada en las cifras declaradas por el fabricante que conoces, en km/L (NUNCA L/100km), como un solo valor por campo (ej: "14 km/L"). Si no tienes ninguna referencia confiable para ese modelo, usa null en ese campo.
- Precio: entrega tu mejor estimación del precio de mercado chileno, redondeada. Los precios cambian, así que prefiere estimaciones conservadoras (levemente hacia arriba) para no romper la regla del presupuesto.
- Esta regla de null aplica SOLO a consumo_ciudad y consumo_ruta. Todos los demás campos son siempre obligatorios.
- SIEMPRE genera el ranking completo. Un dato técnico faltante jamás justifica omitir un auto que encaja con el perfil.

### Nombres locales
Usa exclusivamente los nombres con que cada modelo se comercializa en Chile. Sin años ni versiones en el campo "nombre".

## REGLAS DE CONTENIDO

### La razón
"razon" debe conectar el auto con ESTE perfil específico: menciona al menos un dato concreto del usuario. Prohibido el texto genérico. Test: si la razón sirviera igual para otro usuario distinto, está mal escrita.

### Pros y contras
- pros: 2-4 strings cortos, relevantes para este perfil.
- contras: 2-3 strings cortos y HONESTOS. Todo auto tiene contras; nunca entregues una lista de contras vacía o cosmética.

### Tono
Español chileno directo, cercano y sin jerga técnica innecesaria. Como un amigo que sabe de autos y te dice las cosas como son.

## EJEMPLO DE UN ELEMENTO DEL ARRAY

{
  "rank": 1,
  "nombre": "Suzuki Swift",
  "generacion": "2024",
  "precio": "$11.990.000 CLP",
  "veredicto": "El justo para ti",
  "veredicto_clase": "green",
  "match_pct": 93,
  "razon": "Para tu uso diario en Valparaíso, con subidas y estacionamientos apretados, el Swift es liviano, ágil y gasta poco. Te sobra presupuesto para el pie del seguro y la primera mantención.",
  "motorizacion": "1.2L bencinero",
  "motor_linea": "CVT · Delantera",
  "consumo_ciudad": "16 km/L",
  "consumo_ruta": "20 km/L",
  "pros": ["Bajo consumo real en ciudad", "Repuestos baratos y en todas partes", "Fácil de estacionar en cerros"],
  "contras": ["Maletero chico para viajes largos", "Motor justo con el auto lleno en subida"]
}`;

// --- Rate limiting ---
const rateLimit = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60000;

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

// --- Helpers ---
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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || context.ip || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta en 1 minuto." }), {
      status: 429,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  // Parse body
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

  // Fire and forget the async streaming work
  (async () => {
    let fullText = "";

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
          model: "claude-sonnet-4-6",
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

      // Read the Anthropic SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep the incomplete last line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              const text = event.delta.text;
              fullText += text;
              // Forward each chunk to the client
              await writer.write(encoder.encode(sseEvent({ type: "chunk", text })));
            }

            // Log usage info (optional, for debugging cache hits)
            if (event.type === "message_start" && event.message?.usage) {
              console.log("Usage:", JSON.stringify(event.message.usage));
            }
            if (event.type === "message_delta" && event.usage) {
              console.log("Final usage:", JSON.stringify(event.usage));
            }
          } catch (e) {
            // Skip unparseable lines
          }
        }
      }

      // Send the complete signal with full text
      await writer.write(encoder.encode(sseEvent({ type: "done" })));

      // --- Log to Supabase (fire and forget) ---
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        try {
          const match = fullText.match(/\{[\s\S]*\}/);
          if (match) {
            await fetch(`${process.env.SUPABASE_URL}/rest/v1/interacciones`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: process.env.SUPABASE_KEY,
                Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                perfil: answers,
                autos_recomendados: JSON.parse(match[0]),
              }),
            });
          }
        } catch (logErr) {
          console.error("Supabase log error:", logErr);
        }
      }
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

  // Return the readable stream immediately (avoids timeout)
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

// Netlify Functions v2 config
export const config = {
  path: "/.netlify/functions/ranking",
};