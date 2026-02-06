import { useState } from "react";

export default function AddUserModal({ apiBase, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const API = `${apiBase || ""}/api`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail) {
      setError("Ange e-postadress");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/auth/add-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          name: trimmedName || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.errors?.[0]?.msg || "Kunde inte lägga till användare");
      }
      setSuccess(true);
      setEmail("");
      setPassword("");
      setName("");
      onSuccess?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content add-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Lägg till användare</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Stäng">
            Stäng
          </button>
        </div>
        <p className="add-user-desc">
          Den nya användaren kan logga in med den e-postadress och det lösenord du anger. Registrering är stängd för alla andra.
        </p>
        {success && (
          <div className="add-user-success">
            Användaren har lagts till. De kan logga in med den e-postadressen och lösenordet du angav.
          </div>
        )}
        {error && <div className="add-user-error">{error}</div>}
        <form onSubmit={handleSubmit} className="add-user-form">
          <label>
            E-post
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@exempel.se"
              autoComplete="off"
              required
            />
          </label>
          <label>
            Lösenord (minst 8 tecken)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            Namn (valfritt)
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt namn"
              autoComplete="off"
            />
          </label>
          <div className="add-user-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Lägger till…" : "Lägg till användare"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Stäng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
