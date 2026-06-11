export default function QuizCard({ question: q, step, total, answers, setAnswers, onAnswer, onBack, onSubmit }) {
  return (
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
              onClick={() => onAnswer(opt.title)}
            >
              {opt.img
                ? <img src={opt.img} alt={opt.title} className="svg-opt-img" />
                : <span style={{ fontSize: "5rem", lineHeight: "120px", display: "block", textAlign: "center" }}>🎯</span>
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
                onClick={() => onAnswer(opt.title)}
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
        <button className="btn-ghost" onClick={onBack}>← Volver</button>
        {(q.type === "range" || q.type === "text") && (
          <button className="btn-primary" onClick={onSubmit}>
            {step === total - 1 ? "Ver mi ranking →" : "Continuar →"}
          </button>
        )}
      </div>
    </div>
  );
}
