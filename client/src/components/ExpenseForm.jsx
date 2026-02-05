import { useState } from "react";

const DEFAULT_CATEGORIES = [
  "Boende",
  "El",
  "Mat",
  "Transport",
  "Försäkring",
  "Nöje",
  "Övrigt",
];

export default function ExpenseForm({ month, year, onSubmit, onCancel }) {
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const num = parseFloat(amount?.replace(",", "."));
    if (isNaN(num) || num < 0) {
      setError("Ange ett giltigt belopp");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        month,
        year,
        category: category.trim() || "Övrigt",
        amount: num,
        description: description.trim() || undefined,
      });
    } catch (err) {
      setError(err.message || "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      {error && <div className="expense-form-error">{error}</div>}
      <div className="expense-form-row">
        <label>
          Kategori
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Belopp (kr)
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </label>
      </div>
      <label>
        Beskrivning (valfritt)
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="T.ex. hyra, matbutik"
        />
      </label>
      <div className="expense-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Avbryt
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Sparar..." : "Spara"}
        </button>
      </div>
    </form>
  );
}
