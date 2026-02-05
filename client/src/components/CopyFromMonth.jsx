import { useState } from "react";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => currentYear - 2 + i);

export default function CopyFromMonth({
  currentMonth,
  currentYear,
  onClose,
  onCopy,
}) {
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const [sourceMonth, setSourceMonth] = useState(prevMonth);
  const [sourceYear, setSourceYear] = useState(prevYear);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSameMonth = sourceMonth === currentMonth && sourceYear === currentYear;

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSameMonth) {
      setError("Välj en annan månad att kopiera från.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onCopy(sourceMonth, sourceYear);
      onClose();
    } catch (err) {
      setError(err.message || "Kunde inte kopiera");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content copy-from-month" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Kopiera från annan månad</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Stäng">
            Stäng
          </button>
        </div>
        <p className="copy-from-month-desc">
          Alla rader från vald månad kopieras till <strong>{MONTHS[currentMonth - 1]} {currentYear}</strong>. Befintliga rader i målmånaden påverkas inte.
        </p>
        {error && <div className="copy-from-month-error">{error}</div>}
        <form onSubmit={handleSubmit} className="copy-from-month-form">
          <div className="copy-from-month-row">
            <label>Kopiera från</label>
            <div className="copy-from-month-pickers">
              <select
                value={sourceMonth}
                onChange={(e) => setSourceMonth(Number(e.target.value))}
                className="sheet-input"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={sourceYear}
                onChange={(e) => setSourceYear(Number(e.target.value))}
                className="sheet-input"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="copy-from-month-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Avbryt
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || isSameMonth}
            >
              {loading ? "Kopierar..." : "Kopiera"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
