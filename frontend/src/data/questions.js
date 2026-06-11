export const QUESTIONS = [
  {
    id: "carroceria", label: "Pregunta 1 de 7",
    text: "¿Tienes preferencia por algún tipo de auto?",
    sub: "Elige el que más te acomoda o 'Me da igual'",
    type: "svg_options",
    options: [
      { img: "/sedan.png",    title: "Sedán",       desc: "Elegante, eficiente, ideal ciudad" },
      { img: "/hatchback.png",title: "Hatchback",   desc: "Compacto, fácil de estacionar" },
      { img: "/suv.png",      title: "SUV",         desc: "Altura, espacio, versatilidad" },
      { img: "/pickup.png",   title: "Pickup",      desc: "Trabajo pesado, campo, carga" },
      { img: "/minivan.png",  title: "Minivan",     desc: "Máximo espacio familiar" },
      { img: null,            title: "Me da igual", desc: "Recomiéndame tú" },
    ]
  },
  {
    id: "motor", label: "Pregunta 2 de 7",
    text: "¿Qué tipo de motor prefieres?",
    sub: "Si no sabes, elige 'Sin preferencia'",
    type: "options", cols: 2,
    options: [
      { icon: "⛽", title: "Bencina",           desc: "Lo más común, red de talleres amplia" },
      { icon: "🌿", title: "Híbrido",           desc: "Bencina + eléctrico, sin cargar" },
      { icon: "🔌", title: "Híbrido enchufable",desc: "Enchufas para distancias cortas eléctricas" },
      { icon: "⚡", title: "Eléctrico puro",    desc: "Sin bencina, solo enchufe" },
      { icon: "🎯", title: "Sin preferencia",   desc: "Recomiéndame lo mejor para mí" },
    ]
  },
  {
    id: "presupuesto", label: "Pregunta 3 de 7",
    text: "¿Cuánto tienes disponible?",
    sub: "Precio total en millones de pesos chilenos (CLP)",
    type: "range", min: 4, max: 100, step: 1, defaultVal: 15,
    format: v => `$${v}M CLP`, rangeLow: "$4M", rangeHigh: "$100M"
  },
  {
    id: "prioridad", label: "Pregunta 4 de 7",
    text: "¿Qué es lo más importante para ti?",
    sub: "Elige solo una — la que más te pesa",
    type: "options", cols: 2,
    options: [
      { icon: "💸", title: "Ahorro",        desc: "Poco combustible, mantención barata" },
      { icon: "⚡", title: "Performance",   desc: "Potencia, conducción entretenida" },
      { icon: "🛡️", title: "Confiabilidad", desc: "Que nunca falle, fácil de reparar" },
      { icon: "📦", title: "Espacio",       desc: "Amplio, cómodo, maletero grande" },
    ]
  },
  {
    id: "nuevo_usado", label: "Pregunta 5 de 7",
    text: "¿Nuevo, seminuevo o usado?",
    sub: "Cada opción tiene sus ventajas reales",
    type: "options", cols: 3,
    options: [
      { icon: "✨", title: "Nuevo",      desc: "Garantía total, 0 km" },
      { icon: "🔄", title: "Seminuevo", desc: "1–4 años, como nuevo pero más barato" },
      { icon: "🕰️", title: "Usado",     desc: "5+ años, más auto por la plata" },
    ]
  },
  {
    id: "experiencia", label: "Pregunta 6 de 7",
    text: "¿Cuánta experiencia tienes manejando?",
    sub: "Sin juicio — solo para saber qué tan fácil debe ser el auto",
    type: "options", cols: 2,
    options: [
      { icon: "🆕", title: "Recién saqué la licencia", desc: "Necesito algo fácil y perdonador" },
      { icon: "📅", title: "Pocos años manejando",     desc: "Me defiendo pero no soy experto" },
      { icon: "✅", title: "Manejo con confianza",     desc: "Varios años de experiencia" },
      { icon: "🏁", title: "Manejo experto",           desc: "Disfruto conducir, me gusta el control" },
    ]
  },
  {
    id: "extra", label: "Pregunta 7 de 7",
    text: "¿Algo más que debería saber?",
    sub: "Opcional — cualquier detalle que ayude a afinar el ranking",
    type: "text",
    placeholder: "Ej: tengo perros, manejo en caminos de tierra, soy conductor de app, necesito maletero grande…"
  }
];

export const LABEL_MAP = {
  carroceria: "Tipo de auto",
  motor: "Motor",
  presupuesto: "Presupuesto",
  prioridad: "Prioridad #1",
  nuevo_usado: "Condición",
  experiencia: "Experiencia",
  extra: "Notas"
};
