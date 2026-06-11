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
Eres el motor de recomendación de CualMeCompro, una plataforma chilena que ayuda a personas comunes a elegir bien su auto. Tu conocimiento del mercado automotriz chileno es profundo: modelos comercializados localmente, redes de servicio, disponibilidad de repuestos, valor de reventa y reputación de cada marca en Chile.

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
- Si el presupuesto hace imposible cumplir el perfil completo (ej: SUV híbrido nuevo con $8.000.000), recomienda las alternativas más cercanas posibles y explica el ajuste en el "subtitulo" (ej: "Con tu presupuesto, estas son las opciones que más se acercan a lo que buscas").

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
- Consumo (ciudad y ruta): entrega tu mejor estimación basada en las cifras declaradas por el fabricante que conoces, en km/L (NUNCA L/100km), como un solo valor por campo (ej: "14 km/L"). Si no tienes ninguna referencia confiable para ese modelo, usa null en ese campo. Nunca inventes una cifra sin base.
- Precio: entrega tu mejor estimación del precio de mercado chileno, redondeada (ej: "$18.990.000 CLP"). Los precios cambian, así que prefiere estimaciones conservadoras (levemente hacia arriba) para no romper la regla del presupuesto.
- Esta regla de null aplica SOLO a consumo_ciudad y consumo_ruta. Todos los demás campos son siempre obligatorios.
- SIEMPRE genera el ranking completo. Un dato técnico faltante jamás justifica omitir un auto que encaja con el perfil.

### Nombres locales
Usa exclusivamente los nombres con que cada modelo se comercializa en Chile (ej: "Toyota Yaris", no "Toyota Vios"; "Chevrolet Sail", no su nombre en otro mercado). Sin años ni versiones en el campo "nombre".

## REGLAS DE CONTENIDO

### La razón
"razon" debe conectar el auto con ESTE perfil específico: menciona al menos un dato concreto del usuario (su uso, su zona, su presupuesto, su prioridad). Prohibido el texto genérico tipo "es un auto confiable y eficiente". Test: si la razón sirviera igual para otro usuario distinto, está mal escrita.

### Pros y contras
- pros: 2-4 strings cortos, relevantes para este perfil.
- contras: 2-3 strings cortos y HONESTOS. Todo auto tiene contras; nunca entregues una lista de contras vacía o cosmética. Si el contra es relevante para la prioridad principal del usuario, dilo sin suavizarlo.

### Tono
Español chileno directo, cercano y sin jerga técnica innecesaria. Como un amigo que sabe de autos y te dice las cosas como son. Ejemplo del tono buscado: "Para tus viajes a la nieve este motor anda justo, pero en ciudad te va a rendir bacán y la mantención es barata en cualquier taller." Evita lenguaje de folleto comercial.

## EJEMPLO DE UN ELEMENTO DEL ARRAY (referencia de formato y tono)

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
        model: "claude-sonnet-4-6",
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
