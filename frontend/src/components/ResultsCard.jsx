import { useState } from "react";
import CotizarForm from "./CotizarForm";

function verdTag(v) {
  if (!v) return null;
  const low = v.toLowerCase();
  const cls = low.includes("muy") ? "muy" : low.includes("considerar") ? "con" : "rec";
  return <span className={`tag-verd ${cls}`}>{v}</span>;
}

export default function ResultsCard({ result, error, onBack, onRestart, answers }) {
  const [filter, setFilter] = useState("Todos");
  const [showCotizar, setShowCotizar] = useState(false);
  const [autoSeleccionado, setAutoSeleccionado] = useState(null);

  const veredictos = ["Todos", ...new Set(result?.autos?.map(a => a.veredicto).filter(Boolean))];

  const filteredAutos = result?.autos?.filter(a => {
    if (filter === "Todos") return true;
    return a.veredicto === filter;
  }) || [];

  return (
    <div className="card">
      {error && <div className="error-box">{error}</div>}
      <div className="results-header">
        <div className="results-title">Tu ranking <span>personalizado</span></div>
        <div className="filter-bar">
          {veredictos.map(f => (
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
                    <div className="auto-price">{auto.precio}</div>
                    <button
                      className="btn-primary"
                      style={{ marginTop: "8px", padding: "5px 14px", fontSize: ".75rem" }}
                      onClick={() => { setAutoSeleccionado(auto.nombre); setShowCotizar(true); }}
                    >Cotizar</button>
                  </td>
                  <td>
                    {verdTag(auto.veredicto)}
                    <div className="verd-razon">{auto.razon}</div>
                  </td>
                  <td>
                    <div className="motor-info">{auto.motorizacion}</div>
                    <div className="consumo-tag" style={{ color: "var(--ink2)", marginBottom: "2px" }}>{auto.motor_linea}</div>
                    <div className="consumo-tags">
                      {auto.consumo_ciudad && <span className="consumo-tag">Ciudad: {auto.consumo_ciudad}</span>}
                      {auto.consumo_ruta && <span className="consumo-tag">Ruta: {auto.consumo_ruta}</span>}
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
        <a href="/terminos.html" style={{ color: "var(--ink3)", fontSize: ".75rem", textDecoration: "none" }}>Términos y privacidad</a>
      </div>

      {showCotizar && (
        <CotizarForm autoSeleccionado={autoSeleccionado} answers={answers} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
        {!showCotizar && (
          <button className="btn-primary" onClick={() => {
            setAutoSeleccionado(null);
            setShowCotizar(true);
          }}>
            🚗 Cotizar un auto →
          </button>
        )}
        <button className="btn-ghost" onClick={onBack}>← Volver</button>
        <button className="btn-restart" onClick={onRestart}>Hacer de nuevo</button>
      </div>
    </div>
  );
}
