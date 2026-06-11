export default function IntroCard({ onStart }) {
  return (
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
      <button className="btn-primary" onClick={onStart}>Empezar →</button>
    </div>
  );
}
