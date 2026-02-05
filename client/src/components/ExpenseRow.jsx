import { useState } from "react";

export default function ExpenseRow({
  expense,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}) {
  const [category, setCategory] = useState(expense.category);
  const [amount, setAmount] = useState(String(expense.amount));
  const [description, setDescription] = useState(expense.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    const num = parseFloat(amount?.replace(",", "."));
    if (isNaN(num) || num < 0) {
      setError("Ogiltigt belopp");
      return;
    }
    setLoading(true);
    try {
      await onUpdate({
        category: category.trim(),
        amount: num,
        description: description.trim() || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (isEditing) {
    return (
      <li className="expense-row expense-row-editing">
        {error && <div className="expense-row-error">{error}</div>}
        <div className="expense-row-fields">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Kategori"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Belopp"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskrivning"
          />
        </div>
        <div className="expense-row-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancelEdit}
          >
            Avbryt
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Sparar..." : "Spara"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="expense-row">
      <div className="expense-row-info">
        <span className="expense-row-category">{expense.category}</span>
        {expense.description && (
          <span className="expense-row-desc">{expense.description}</span>
        )}
      </div>
      <span className="expense-row-amount">
        {Number(expense.amount).toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
        })}{" "}
        kr
      </span>
      <div className="expense-row-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onEdit}
          aria-label="Redigera"
        >
          Redigera
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-danger"
          onClick={() => {
            if (window.confirm("Ta bort denna utgift?")) onDelete();
          }}
          aria-label="Ta bort"
        >
          Ta bort
        </button>
      </div>
    </li>
  );
}
