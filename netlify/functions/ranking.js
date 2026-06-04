exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  const SYSTEM_PROMPT = `Eres un experto en el mercado automotriz chileno. Genera un ranking de autos personalizado según el perfil del usuario.

Responde SOLO con JSON válido, sin texto adicional ni markdown. Formato exacto:

{
  "titulo": "string corto descriptivo",
  "subtitulo": "string con contexto del ranking",
  "autos": [
    {
      "rank": 1,
      "nombre": "Marca Modelo",
      "generacion": "año o generación relevante",
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

Reglas:
- 7 a 10 autos ordenados de mejor a peor para este perfil
- veredicto_clase: green=muy recomendado, blue=buena opción, purple=a considerar, amber=con reservas, red=poco recomendado
- match_pct: entre 40 y 98
- Usa modelos reales disponibles en Chile (usado o nuevo según presupuesto)
- La razón debe ser específica al perfil dado, no descripción genérica del auto
- pros y contras: 2-4 items como strings simples
- Considera: redes de servicio por zona, disponibilidad repuestos, precio mercado chileno
- Consumo expresado en km/L (kilómetros por litro), NO en L/100km
- Lenguaje español chileno directo y profesional`;

  try {
    const { profileText } = JSON.parse(event.body);
    if (!profileText) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta profileText" }) };
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
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Genera un ranking de autos para este usuario:\n\n${profileText}` }]
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

    return { statusCode: 200, headers, body: match[0] };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
