if (!global.rateLimitMap) global.rateLimitMap = {};

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  // Rate limiting
  const clientIP = event.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;

  if (!global.rateLimitMap[clientIP]) {
    global.rateLimitMap[clientIP] = { count: 1, start: now };
  } else if (now - global.rateLimitMap[clientIP].start > windowMs) {
    global.rateLimitMap[clientIP] = { count: 1, start: now };
  } else if (global.rateLimitMap[clientIP].count >= maxRequests) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Demasiadas solicitudes. Espera un momento e intenta de nuevo." }) };
  } else {
    global.rateLimitMap[clientIP].count++;
  }

  const SYSTEM_PROMPT = `
  
Eres un experto en el mercado automotriz chileno. Genera un ranking de autos personalizado según el perfil del usuario.

Responde SOLO con JSON válido, sin texto adicional ni markdown. Formato exacto:

{
  "titulo": "string corto descriptivo",
  "subtitulo": "string con contexto del ranking",
  "autos": [
    {
      "rank": 1,
      "nombre": "Marca Modelo",
      "generacion": "año o generación relevante",
      "precio": "$XX.000.000 CLP",
      "veredicto": "etiqueta corta",
      "veredicto_clase": "green",
      "match_pct": 95,
      "razon": "2-3 oraciones explicando por qué encaja con ESTE perfil específico, en lenguaje simple",
      "motorizacion": "descripción corta de motores disponibles",
      "motor_linea": "transmisión · tracción",
      "consumo_ciudad": "X–Y km/L",
      "consumo_ruta": "X–Y km/L",
      "pros": ["pro 1", "pro 2", "pro 3"],
      "contras": ["contra 1", "contra 2"]
    }
  ]
}

Instrucciones:
- 7 a 10 autos ordenados de mejor a peor para este perfil
- Veredicto_clase: green=muy recomendado, blue=buena opción, purple=a considerar, amber=con reservas, red=poco recomendado
- Usa modelos reales disponibles en Chile, los nombres deben ser con los que se comercializan localmente en chile, es decir "Toyota Yaris" no "Toyota Vios" si ese es el nombre local, o "Kia Seltos" no "Kia Seltos 2024" si ese es el nombre local, etc.
- La razón debe ser específica al perfil dado, no descripción genérica del auto
- pros y contras: 2-4 items como strings simples
- Considera: redes de servicio por zona, disponibilidad repuestos, precio mercado chileno, valor de reventa, experiencia de manejo, seguridad, tecnología, etc. pero siempre con foco en el perfil del usuario.
- Consumo expresado en km/L (kilómetros por litro), NO en L/100km, y debe ser el declarado por el fabricante para cada modelo, no estimaciones genéricas.
- Debes extraer la informacion de sitios confiables para los datos tecnicos del vehiculo, para los comentarios descriptivos puedes inlcuir sitios de reseñas y opiniones.
- Lenguaje español chileno directo y profesional
- Precio: precio de mercado chileno actual del modelo recomendado, formato "$xxx.xxx.xxx CLP". Solo incluye autos cuyo precio sea igual o menor al presupuesto del usuario. Si el auto tiene rango de precios, usa el precio más bajo disponible.
- CRÍTICO: El presupuesto del usuario es un límite MÁXIMO absoluto. NUNCA incluyas autos cuyo precio supere el presupuesto indicado.
Restricciones:
- Si tienes dudas sobre algún dato técnico específico, inclúyelo con tu mejor estimación pero márcalo como aproximado en la razón. Es mejor un ranking con datos aproximados que un JSON vacío.
- Si no estás seguro de un dato técnico específico (consumo, motor), ponlo como null. Pero SIEMPRE genera el ranking con los autos que mejor encajen.
`;

  try {
    const { profileText, answers } = JSON.parse(event.body);
    
    // Validación de input
    if (!profileText) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta profileText" }) };
    }
    if (profileText.length > 2000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Input demasiado largo" }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "API key no configurada" }) };
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [{ 
          role: "user", 
          content: `Genera un ranking de autos para este usuario. El presupuesto máximo es ABSOLUTO, no incluyas ningún auto que lo supere:\n\n${profileText}`
        }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: `Anthropic error ${res.status}: ${err.substring(0, 200)}` }) };
    }

    const data = await res.json();
    const textBlock = data.content?.find(b => b.type === "text");
    if (!textBlock?.text) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Sin respuesta de la IA" }) };
    }

    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "La IA no devolvió JSON válido" }) };
    }

    // Guardar log en Supabase
    try {
      const supaRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/interacciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.SUPABASE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          perfil: answers,
          autos_recomendados: JSON.parse(match[0])
        })
      });
      const supaText = await supaRes.text();
      console.log("Supabase status:", supaRes.status, supaText);
    } catch (logErr) {
      console.error("Error guardando log:", logErr);
    }

    return { statusCode: 200, headers, body: match[0] };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};