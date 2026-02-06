import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name || undefined);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Registrering misslyckades");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-card">
        <div className="auth-header">
          <h1>Hem Ekonomi</h1>
          <p>Skapa konto för att komma igång</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <label>
            E-post
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@exempel.se"
              autoComplete="email"
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
              autoComplete="name"
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
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Skapar konto..." : "Registrera"}
          </button>
        </form>
        <p className="auth-footer">
          Har du redan konto? <Link to="/login">Logga in</Link>
        </p>
      </div>
    </div>
  );
}
