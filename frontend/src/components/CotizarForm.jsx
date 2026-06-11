import { useState, useRef, useEffect } from "react";

export default function CotizarForm({ autoSeleccionado, answers }) {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const telefono = e.target.telefono.value.replace(/\s/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(telefono)) {
      setError("Ingresa un teléfono válido (solo números, 8–15 dígitos).");
      return;
    }
    setError(false);
    setEnviando(true);
    try {
      const fd = new FormData(e.target);
      fd.append("access_key", "f1803b80-2d28-4cce-a456-4e6e0f4d9e87");
      fd.append("subject", `Nuevo lead CualMeCompro — ${autoSeleccionado}`);
      const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
      const data = await res.json();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          nombre: fd.get("nombre"),
          telefono: fd.get("telefono"),
          email: fd.get("email"),
          auto_interes: autoSeleccionado,
          perfil: answers
        })
      });
      if (data.success) {
        setEnviado(true);
      } else {
        setError("No se pudo enviar. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div ref={ref} className="cotizar-box">
      <div className="cotizar-label">Cotiza tu auto</div>

      {!autoSeleccionado ? (
        <div className="cotizar-title">
          Selecciona un auto usando el botón <strong>Cotizar</strong> en la tabla para continuar.
        </div>
      ) : (
        <>
          <div className="cotizar-title">
            Te contactamos con una concesionaria para el{" "}
            <span style={{ color: "var(--accent)" }}>{autoSeleccionado}</span>
          </div>
          {enviado ? (
            <div style={{ color: "var(--green)", fontWeight: 600, fontSize: "1rem" }}>
              ✓ ¡Listo! Te contactaremos pronto.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input type="hidden" name="auto_interes" value={autoSeleccionado} />
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                <input name="nombre" required placeholder="Tu nombre" className="cotizar-input" />
                <input name="telefono" required placeholder="Teléfono (ej: +56912345678)" className="cotizar-input" />
                <input name="email" type="email" required placeholder="Email" className="cotizar-input" />
              </div>
              {error && <div style={{ color: "#e53e3e", fontSize: ".85rem", marginBottom: "10px" }}>{error}</div>}
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Enviando..." : "Quiero que me contacten →"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
