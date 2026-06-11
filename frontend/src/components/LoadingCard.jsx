import { LABEL_MAP } from "../data/questions";

export default function LoadingCard({ answers, streamingText }) {
  return (
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
        {streamingText && (
          <div className="streaming-box">
            <div className="streaming-label">
              <span className="streaming-dot" />
              Generando ranking...
            </div>
            <pre className="streaming-text">
              {streamingText.slice(-400)}
            </pre>
            <div className="streaming-fade" />
          </div>
        )}
      </div>
    </div>
  );
}
