import { useState, useEffect, useRef } from "react";

const QUESTIONS = [
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

const LABEL_MAP = {
  carroceria: "Tipo de auto", motor: "Motor", presupuesto: "Presupuesto",
  prioridad: "Prioridad #1", nuevo_usado: "Condición", experiencia: "Experiencia",
  extra: "Notas"
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;600;700&family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;1,14..32,300&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #ffffff;
    --bg2:      #f5f5f7;
    --surface:  #ffffff;
    --border:   #e0e0e5;
    --accent:   #0071e3;
    --accent-h: #0077ed;
    --ink1:     #1d1d1f;
    --ink2:     #6e6e73;
    --ink3:     #aeaeb2;
    --green:    #34c759;
    --amber:    #ff9f0a;
    --red:      #ff3b30;
    --radius:   18px;
    --font-head: 'Figtree', -apple-system, sans-serif;
    --font-body: 'Figtree', -apple-system, sans-serif;
  }

  body { background: var(--bg); color: var(--ink1); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 20px 80px;
    background: var(--bg);
  }

  /* ── NAV ── */
  .nav {
    width: 100%;
    max-width: 800px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28px 0 36px;
  }
  .logo {
    font-family: var(--font-head);
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--ink1);
    letter-spacing: -0.01em;
  }
  .logo span { color: var(--accent); }
  .nav-step { font-size: .8rem; color: var(--ink3); font-weight: 400; }

  /* ── PROGRESS ── */
  .progress-bar {
    width: 100%;
    max-width: 800px;
    height: 2px;
    background: var(--border);
    border-radius: 99px;
    margin-bottom: 48px;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 99px;
    transition: width .5s cubic-bezier(.4,0,.2,1);
  }

  /* ── CARD ── */
  .card {
    width: 100%;
    max-width: 800px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 52px 56px;
    animation: fadeUp .4s cubic-bezier(.4,0,.2,1);
    box-shadow: 0 2px 20px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06);
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── INTRO ── */
  .intro-label {
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 20px;
  }
  .intro-title {
    font-family: var(--font-head);
    font-size: 3rem;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: var(--ink1);
    margin-bottom: 16px;
  }
  .intro-lead {
    font-size: 1.05rem;
    color: var(--ink2);
    line-height: 1.7;
    font-weight: 300;
    margin-bottom: 36px;
    max-width: 520px;
  }
  .intro-items { display: flex; flex-direction: column; gap: 12px; margin-bottom: 44px; }
  .intro-item { display: flex; align-items: center; gap: 12px; font-size: .9rem; color: var(--ink2); font-weight: 400; }
  .intro-dot { width: 5px; height: 5px; background: var(--accent); border-radius: 50%; flex-shrink: 0; }

  /* ── QUESTION ── */
  .q-label { font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--ink3); margin-bottom: 14px; }
  .q-text {
    font-family: var(--font-head);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: var(--ink1);
    margin-bottom: 6px;
  }
  .q-sub { font-size: .875rem; color: var(--ink3); margin-bottom: 32px; font-weight: 400; }

  /* ── OPTIONS ── */
  .options-grid { display: grid; gap: 10px; }
  .opts-2 { grid-template-columns: 1fr 1fr; }
  .opts-3 { grid-template-columns: 1fr 1fr 1fr; }
  .opts-1 { grid-template-columns: 1fr; }

  .opt-btn {
    background: var(--bg2);
    border: 1.5px solid transparent;
    border-radius: var(--radius);
    padding: 18px 20px;
    text-align: left;
    cursor: pointer;
    transition: all .18s cubic-bezier(.4,0,.2,1);
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .opt-btn:hover { background: #ebebf0; border-color: var(--border); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,.06); }
  .opt-btn.selected { background: #e8f1fb; border-color: var(--accent); }
  .opt-icon { font-size: 1.3rem; margin-bottom: 4px; }
  .opt-title { font-family: var(--font-head); font-size: .9rem; font-weight: 600; color: var(--ink1); }
  .opt-desc { font-size: .78rem; color: var(--ink2); line-height: 1.4; font-weight: 400; }

  /* ── SVG OPTIONS ── */
  .svg-options-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .svg-opt-btn {
    background: var(--bg2);
    border: 1.5px solid transparent;
    border-radius: var(--radius);
    padding: 20px 14px 16px;
    text-align: center;
    cursor: pointer;
    transition: all .18s cubic-bezier(.4,0,.2,1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--ink2);
  }
  .svg-opt-btn:hover { background: #ebebf0; border-color: var(--border); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,.06); }
  .svg-opt-btn.selected { background: #e8f1fb; border-color: var(--accent); color: var(--accent); }
  .svg-opt-btn svg { width: 100%; max-width: 110px; height: 52px; }
  .svg-opt-img { width: 100%; max-width: 220px; height: 160px; object-fit: contain; }
  .svg-opt-title { font-family: var(--font-head); font-size: .85rem; font-weight: 600; color: var(--ink1); }
  .svg-opt-desc { font-size: .72rem; color: var(--ink3); }

  /* ── RANGE ── */
  .range-wrap { padding: 8px 0 20px; }
  .range-val { font-family: var(--font-head); font-size: 2.6rem; font-weight: 700; color: var(--ink1); letter-spacing: -0.04em; margin-bottom: 20px; }
  input[type=range] {
    -webkit-appearance: none;
    width: 100%; height: 3px;
    background: var(--border);
    border-radius: 99px;
    outline: none;
    cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    border: 3px solid #fff;
    box-shadow: 0 0 0 1px var(--accent), 0 2px 8px rgba(0,113,227,.3);
  }
  .range-labels { display: flex; justify-content: space-between; margin-top: 10px; font-size: .78rem; color: var(--ink3); }

  /* ── TEXTAREA ── */
  .text-wrap { padding: 4px 0; }
  .q-textarea {
    width: 100%;
    background: var(--bg2);
    border: 1.5px solid transparent;
    border-radius: var(--radius);
    color: var(--ink1);
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: 1.6;
    padding: 16px 18px;
    resize: none;
    outline: none;
    transition: border-color .2s;
    font-weight: 400;
  }
  .q-textarea::placeholder { color: var(--ink3); }
  .q-textarea:focus { border-color: var(--accent); background: #fff; box-shadow: 0 0 0 3px rgba(0,113,227,.1); }

  /* ── BUTTONS ── */
  .btn-primary {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 980px;
    padding: 14px 30px;
    font-family: var(--font-head);
    font-size: .95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
    letter-spacing: -0.01em;
  }
  .btn-primary:hover { background: var(--accent-h); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,113,227,.3); }
  .btn-ghost {
    background: transparent;
    color: var(--accent);
    border: none;
    padding: 14px 20px;
    font-family: var(--font-body);
    font-size: .9rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity .15s;
  }
  .btn-ghost:hover { opacity: .7; }
  .btn-restart {
    background: var(--bg2);
    color: var(--ink1);
    border: none;
    border-radius: 980px;
    padding: 14px 28px;
    font-family: var(--font-head);
    font-size: .9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
  }
  .btn-restart:hover { background: #e0e0e5; }
  .q-actions { display: flex; align-items: center; gap: 8px; margin-top: 32px; }

  /* ── LOADING ── */
  .loading-wrap { display: flex; flex-direction: column; align-items: center; gap: 28px; padding: 24px 0; }
  .spinner {
    width: 40px; height: 40px;
    border: 2.5px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-title { font-family: var(--font-head); font-size: 1.4rem; font-weight: 700; color: var(--ink1); text-align: center; letter-spacing: -0.02em; }
  .loading-sub { font-size: .875rem; color: var(--ink3); text-align: center; }
  .profile-summary { width: 100%; background: var(--bg2); border-radius: var(--radius); padding: 20px 24px; }
  .profile-summary h4 { font-size: .72rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--ink3); margin-bottom: 12px; }
  .profile-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { background: #fff; border: 1px solid var(--border); border-radius: 99px; padding: 5px 13px; font-size: .8rem; color: var(--ink2); }
  .chip strong { color: var(--ink1); font-weight: 600; }

  /* ── RESULTS ── */
  .results-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .results-title { font-family: var(--font-head); font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; color: var(--ink1); }
  .results-title span { color: var(--accent); }
  .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
  .filter-btn {
    background: var(--bg2);
    border: none;
    border-radius: 99px;
    padding: 6px 16px;
    font-size: .8rem;
    font-weight: 500;
    color: var(--ink2);
    cursor: pointer;
    transition: all .15s;
  }
  .filter-btn:hover { background: #e0e0e5; color: var(--ink1); }
  .filter-btn.active { background: var(--ink1); color: #fff; }

  /* ── TABLE ── */
  .table-wrap { overflow-x: auto; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; min-width: 560px; }
  th {
    text-align: left;
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink3);
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
  }
  td { padding: 18px 14px; border-bottom: 1px solid var(--border); vertical-align: top; font-size: .875rem; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--bg2); transition: background .12s; }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    border-radius: 50%;
    font-family: var(--font-head);
    font-weight: 700;
    font-size: .85rem;
  }
  .rg { background: rgba(52,199,89,.12); color: var(--green); }
  .rs { background: rgba(0,113,227,.1); color: var(--accent); }
  .rb { background: rgba(255,159,10,.12); color: var(--amber); }
  .rn { background: var(--bg2); color: var(--ink3); }

  .auto-name { font-family: var(--font-head); font-weight: 700; color: var(--ink1); font-size: .95rem; }
  .auto-price { font-size: .78rem; color: var(--ink3); margin-top: 3px; }

  .tag-verd {
    display: inline-block;
    padding: 3px 11px;
    border-radius: 99px;
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .02em;
    margin-bottom: 7px;
  }
  .tag-verd.muy { background: rgba(52,199,89,.1); color: #1a8a35; }
  .tag-verd.rec { background: rgba(0,113,227,.1); color: var(--accent); }
  .tag-verd.con { background: rgba(255,159,10,.1); color: #b86800; }

  .verd-razon { font-size: .8rem; color: var(--ink2); line-height: 1.55; }
  .motor-info { font-size: .8rem; color: var(--ink2); }
  .consumo-tags { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
  .consumo-tag { font-size: .75rem; color: var(--ink3); }

  .pros-cons { display: flex; flex-direction: column; gap: 4px; }
  .pro, .con { font-size: .78rem; padding-left: 14px; position: relative; }
  .pro { color: #1a8a35; }
  .pro::before { content: '+'; position: absolute; left: 0; font-weight: 700; }
  .con { color: var(--red); }
  .con::before { content: '−'; position: absolute; left: 0; font-weight: 700; }

  .footer { margin-top: 16px; font-size: .75rem; color: var(--ink3); display: flex; gap: 12px; flex-wrap: wrap; }
  .results-actions { display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap; }

  .error-box {
    background: rgba(255,59,48,.06);
    border: 1px solid rgba(255,59,48,.2);
    border-radius: var(--radius);
    padding: 18px 22px;
    color: var(--red);
    font-size: .9rem;
    margin-bottom: 20px;
  }

  @media (max-width: 600px) {
    .card { padding: 32px 24px; }
    .intro-title { font-size: 2.2rem; }
    .q-text { font-size: 1.5rem; }
    .svg-options-grid { grid-template-columns: repeat(2, 1fr); }
    .opts-3 { grid-template-columns: 1fr 1fr; }
  }
`;

export default function App() {
  const [phase, setPhase] = useState("intro"); // intro | quiz | loading | results
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("Todos");
  const [showCotizar, setShowCotizar] = useState(false);
  const [cotizarEnviado, setCotizarEnviado] = useState(false);
  const [autoSeleccionado, setAutoSeleccionado] = useState(null);
  const cotizarRef = useRef(null);
  const q = QUESTIONS[step];
  const total = QUESTIONS.length;
  const progress = phase === "intro" ? 0 : phase === "results" ? 100 : ((step / total) * 100);

  function startQuiz() { setPhase("quiz"); setStep(0); }

  function answer(val) {
    const updated = { ...answers, [q.id]: val };
    setAnswers(updated);
    if (step < total - 1) {
      setTimeout(() => setStep(s => s + 1), q.type === "range" ? 0 : 180);
    }
  }

  function goBack() {
    if (phase === "results") { setPhase("quiz"); setStep(total - 1); return; }
    if (step === 0) { setPhase("intro"); } else { setStep(s => s - 1); }
  }

function restart() {
    setPhase("intro"); setStep(0); setAnswers({}); setResult(null); setError(null);
    setShowCotizar(false); setCotizarEnviado(false);
    setAutoSeleccionado(null);
  }

  async function submit() {
    const ans = answers;
    const profileText = [
      `Tipo de carrocería preferida: ${ans.carroceria}`,
      `Tipo de motor preferido: ${ans.motor}`,
      `Presupuesto: $${ans.presupuesto}M CLP`,
      `Prioridad principal: ${ans.prioridad}`,
      `Condición del auto: ${ans.nuevo_usado}`,
      `Experiencia manejando: ${ans.experiencia}`,
      ans.extra ? `Información adicional: ${ans.extra}` : null,
    ].filter(Boolean).join("\n");

    setPhase("loading");
    setError(null);

    try {
      const res = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      // ranking.js puede devolver { autos: [...] } o { titulo, subtitulo, autos: [...] }
      const autos = data.autos || [];
      if (!autos.length) throw new Error("Sin resultados");
      setResult({ autos, profile: ans });
      setPhase("results");
    } catch (e) {
      setError("⚠️ No pude generar el ranking. Verifica tu conexión e intenta de nuevo.");
      setPhase("results");
      setResult({ autos: [], profile: ans });
    }
  }

  const verdTag = v => {
    if (!v) return null;
    const low = v.toLowerCase();
    const cls = low.includes("muy") ? "muy" : low.includes("considerar") ? "con" : "rec";
    return <span className={`tag-verd ${cls}`}>{v}</span>;
  };

  const filteredAutos = result?.autos?.filter(a => {
    if (filter === "Todos") return true;
    return a.veredicto?.toLowerCase().includes(filter.toLowerCase());
  }) || [];

  return (
    <>
      <style>{css}</style>
      <div className="app-shell">
        <nav className="nav">
          <div className="logo"><span>C</span>ual<span>M</span>e<span>C</span>ompro</div>
          {phase === "quiz" && (
            <span style={{ fontSize: ".8rem", color: "var(--ink3)" }}>
              {step + 1} / {total}
            </span>
          )}
        </nav>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="card">
            <div className="intro-label">Chile · 2024–2025</div>
            <h1 className="intro-title">El auto correcto<br/>para <em>ti.</em></h1>
            <p className="intro-lead">
              7 preguntas. Sin tecnicismos. Sin jerga de concesionario. Al final recibes
              un ranking personalizado de los autos que más encajan con tu perfil real.
            </p>
            <div className="intro-items">
              {[
                "Menos de 2 minutos",
                "Ranking generado con IA según tu perfil exacto",
                "Pros, contras y por qué encaja contigo",
                "Contexto Chile: repuestos, redes, precios reales",
              ].map(t => (
                <div key={t} className="intro-item">
                  <span className="intro-dot" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={startQuiz}>Empezar →</button>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === "quiz" && (
          <div className="card" key={step}>
            <div className="q-label">{q.label}</div>
            <div className="q-text">{q.text}</div>
            <div className="q-sub">{q.sub}</div>

            {q.type === "svg_options" && (
              <div className="svg-options-grid">
                {q.options.map(opt => (
                  <button
                    key={opt.title}
                    className={`svg-opt-btn ${answers[q.id] === opt.title ? "selected" : ""}`}
                    onClick={() => answer(opt.title)}
                  >
                    {opt.img
                      ? <img src={opt.img} alt={opt.title} className="svg-opt-img" />
                      : <span style={{ fontSize: "5rem", lineHeight: "120px", display:"block", textAlign:"center" }}>🎯</span>
                    }
                    <div className="svg-opt-title">{opt.title}</div>
                    <div className="svg-opt-desc">{opt.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {q.type === "options" && (() => {
              const n = q.options.length;
              const cls = n <= 3 ? `opts-${n}` : "opts-2";
              return (
                <div className={`options-grid ${cls}`}>
                  {q.options.map(opt => (
                    <button
                      key={opt.title}
                      className={`opt-btn ${answers[q.id] === opt.title ? "selected" : ""}`}
                      onClick={() => answer(opt.title)}
                    >
                      <span className="opt-icon">{opt.icon}</span>
                      <span className="opt-title">{opt.title}</span>
                      <span className="opt-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              );
            })()}

            {q.type === "range" && (
              <div className="range-wrap">
                <div className="range-val">{q.format(answers[q.id] ?? q.defaultVal)}</div>
                <input
                  type="range"
                  min={q.min} max={q.max} step={q.step}
                  value={answers[q.id] ?? q.defaultVal}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: +e.target.value }))}
                />
                <div className="range-labels"><span>{q.rangeLow}</span><span>{q.rangeHigh}</span></div>
              </div>
            )}

            {q.type === "text" && (
              <div className="text-wrap">
                <textarea
                  className="q-textarea"
                  rows={4}
                  placeholder={q.placeholder}
                  value={answers[q.id] ?? ""}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                />
              </div>
            )}

            <div className="q-actions">
              <button className="btn-ghost" onClick={goBack}>← Volver</button>
              {(q.type === "range" || q.type === "text") && (
                <button className="btn-primary" onClick={() => {
                  if (step < total - 1) setStep(s => s + 1);
                  else submit();
                }}>
                  {step === total - 1 ? "Ver mi ranking →" : "Continuar →"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <div className="card">
            <div className="loading-wrap">
              <div className="spinner" />
              <div className="loading-title">Analizando tu perfil…</div>
              <div className="loading-sub">Estamos cruzando tu perfil con el mercado chileno 2024–2025</div>
              <div className="profile-summary">
                <h4>Tu perfil</h4>
                <div className="profile-chips">
                  {Object.entries(answers).filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="chip">
                      <strong>{LABEL_MAP[k] || k}:</strong> {String(v).replace(/ \(.*?\)/, "")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && result && (
          <div className="card">
            {error && <div className="error-box">{error}</div>}
            <div className="results-header">
              <div className="results-title">Tu ranking <span>personalizado</span></div>
              <div className="filter-bar">
                {["Todos", "Muy recomendado", "Recomendado", "Considerar"].map(f => (
                  <button
                    key={f}
                    className={`filter-btn ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >{f}</button>
                ))}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Auto</th>
                    <th>Veredicto</th>
                    <th>Motor / Consumo</th>
                    <th>Pros / Contras</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAutos.map((auto, i) => {
                    const origIdx = result.autos.indexOf(auto);
                    const rankCls = origIdx === 0 ? "rg" : origIdx === 1 ? "rs" : origIdx === 2 ? "rb" : "rn";
                    const rankNum = origIdx + 1;
                    return (
                      <tr key={i}>
                        <td><span className={`rank-badge ${rankCls}`}>{rankNum}</span></td>
                        <td>
                          <div className="auto-name">{auto.nombre}</div>
                          <div className="auto-price">{auto.precio_desde}</div>
                          <button 
                            className="btn-primary"
                            style={{marginTop:"8px", padding:"5px 14px", fontSize:".75rem"}}
                            onClick={() => { setAutoSeleccionado(auto.nombre); setShowCotizar(true); setTimeout(() => cotizarRef.current?.scrollIntoView({ behavior:"smooth" }), 50); }}
                          >Cotizar</button>
                        </td>
                        <td>
                          {verdTag(auto.veredicto)}
                          <div className="verd-razon">{auto.razon}</div>
                        </td>
                        <td>
                          <div className="motor-info">{auto.motor_disponible}</div>
                          <div className="consumo-tags">
                            {auto.consumo_ciudad && <span className="consumo-tag" style={{ color: "var(--ink2)" }}>Ciudad: {auto.consumo_ciudad}</span>}
                            {auto.consumo_ruta && <span className="consumo-tag" style={{ color: "var(--ink3)" }}>Ruta: {auto.consumo_ruta}</span>}
                          </div>
                        </td>
                        <td className="pros-cons">
                          {(auto.pros || []).map((p, j) => <span key={j} className="pro">{p}</span>)}
                          {(auto.contras || []).map((c, j) => <span key={j} className="con">{c}</span>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

    <div className="footer">
      <span>★ CualMeCompro · Ranking con IA · Chile 2025</span>
      <span>· Consumos en km/L estimado ciclo mixto real</span>
      <a href="/terminos.html" style={{color:"var(--ink3)",fontSize:".75rem",textDecoration:"none"}}>Términos y privacidad</a>
    </div>

            <div className="results-actions">
                    {/* ── COTIZAR ── */}
                    {showCotizar ? (
                      <div ref={cotizarRef} style={{marginTop:"28px", background:"var(--bg2)", borderRadius:"var(--radius)", padding:"28px 32px", border:"1px solid var(--border)"}}>
                        <div style={{fontSize:".72rem", fontWeight:600, letterSpacing:".12em", textTransform:"uppercase", color:"var(--accent)", marginBottom:"12px"}}>Cotiza tu auto</div>
                        <div style={{fontSize:"1.1rem", fontWeight:700, marginBottom:"20px", letterSpacing:"-0.01em"}}>
                          Te contactamos con una concesionaria para el <span style={{color:"var(--accent)"}}>{autoSeleccionado}</span>
                        </div>
                        {cotizarEnviado ? (
                          <div style={{color:"var(--green)", fontWeight:600, fontSize:"1rem"}}>✓ ¡Listo! Te contactaremos pronto.</div>
                        ) : (
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target);
                            fd.append("access_key", "f1803b80-2d28-4cce-a456-4e6e0f4d9e87");
                            fd.append("subject", `Nuevo lead CualMeCompro — ${autoSeleccionado}`);
                            await fetch("https://api.web3forms.com/submit", { method:"POST", body: fd });
                            setCotizarEnviado(true);
                          }}>
                            <input type="hidden" name="auto_interes" value={autoSeleccionado} />
                            <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"16px"}}>
                              <input name="nombre" required placeholder="Tu nombre" style={{background:"#fff", border:"1.5px solid var(--border)", borderRadius:"12px", padding:"12px 16px", fontSize:".95rem", fontFamily:"var(--font)", outline:"none"}} />
                              <input name="telefono" required placeholder="Teléfono" style={{background:"#fff", border:"1.5px solid var(--border)", borderRadius:"12px", padding:"12px 16px", fontSize:".95rem", fontFamily:"var(--font)", outline:"none"}} />
                              <input name="email" type="email" required placeholder="Email" style={{background:"#fff", border:"1.5px solid var(--border)", borderRadius:"12px", padding:"12px 16px", fontSize:".95rem", fontFamily:"var(--font)", outline:"none"}} />
                            </div>
                            <button type="submit" className="btn-primary">Quiero que me contacten →</button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <button className="btn-primary" style={{marginTop:"28px"}} onClick={() => setShowCotizar(true)}>
                        🚗 Quiero cotizar el #{result?.autos?.[0]?.nombre} →
                      </button>
                    )}
              <button className="btn-ghost" onClick={goBack}>← Volver</button>
              <button className="btn-restart" onClick={restart}>Hacer de nuevo</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
