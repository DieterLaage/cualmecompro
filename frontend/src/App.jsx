import { useState } from "react";
import { QUESTIONS } from "./data/questions";
import IntroCard from "./components/IntroCard";
import QuizCard from "./components/QuizCard";
import LoadingCard from "./components/LoadingCard";
import ResultsCard from "./components/ResultsCard";
import "./styles/app.css";

export default function App() {
  const [phase, setPhase] = useState("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [streamingText, setStreamingText] = useState("");

  const q = QUESTIONS[step];
  const total = QUESTIONS.length;
  const progress = phase === "intro" ? 0 : phase === "results" ? 100 : ((step / total) * 100);

  function startQuiz() { setPhase("quiz"); setStep(0); }

  function answer(val) {
    setAnswers(prev => ({ ...prev, [q.id]: val }));
    if (step < total - 1) {
      setTimeout(() => setStep(s => s + 1), q.type === "range" ? 0 : 180);
    }
  }

  function handleNextOrSubmit() {
    if (step < total - 1) setStep(s => s + 1);
    else submit();
  }

  function goBack() {
    if (phase === "results") { setPhase("quiz"); setStep(total - 1); return; }
    if (step === 0) { setPhase("intro"); } else { setStep(s => s - 1); }
  }

  function restart() {
    setPhase("intro"); setStep(0); setAnswers({}); setResult(null); setError(null);
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
    setStreamingText("");

    try {
      const res = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText, answers }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let metaData = null;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "chunk") {
              fullText += event.text;
              setStreamingText(fullText);
            }

            if (event.type === "meta") {
              metaData = event;
            }

            if (event.type === "error") {
              throw new Error(event.message);
            } catch (e) {
            if (e.message?.includes("Anthropic")) throw e;
          }
        }
      }

      const match = fullText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("La IA no devolvió JSON válido");

      const data = JSON.parse(match[0]);
      const autos = data.autos || [];
      if (!autos.length) throw new Error("Sin resultados");

      setResult({ autos, profile: ans });
      setPhase("results");
      // Log a Supabase
            if (metaData) {
              fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/interacciones`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({
                  perfil: ans,
                  ranking: data,
                  modelo: metaData.modelo,
                  tiempo_ms: metaData.tiempo_ms,
                  tokens_input: metaData.tokens_input,
                  tokens_output: metaData.tokens_output,
                  tokens_cache: metaData.tokens_cache,
                  precio_usd: metaData.precio_usd,
                }),
              }).catch(err => console.error("Log error:", err));
            }
    } catch (e) {
      setError("⚠️ No pude generar el ranking. Verifica tu conexión e intenta de nuevo.");
      setPhase("results");
      setResult({ autos: [], profile: ans });
    } finally {
      setStreamingText("");
    }
  }

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="logo"><span>C</span>ual<span>M</span>e<span>C</span>ompro</div>
        {phase === "quiz" && (
          <span style={{ fontSize: ".8rem", color: "var(--ink3)" }}>{step + 1} / {total}</span>
        )}
      </nav>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {phase === "intro" && <IntroCard onStart={startQuiz} />}

      {phase === "quiz" && (
        <QuizCard
          question={q}
          step={step}
          total={total}
          answers={answers}
          setAnswers={setAnswers}
          onAnswer={answer}
          onBack={goBack}
          onSubmit={handleNextOrSubmit}
        />
      )}

      {phase === "loading" && (
        <LoadingCard answers={answers} streamingText={streamingText} />
      )}

      {phase === "results" && result && (
        <ResultsCard
          result={result}
          error={error}
          answers={answers}
          onBack={goBack}
          onRestart={restart}
        />
      )}
    </div>
  );
}
