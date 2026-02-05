import { useState } from "react";
import ExpenseRow from "./ExpenseRow";

export default function ExpenseList({
  expenses,
  monthName,
  year,
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (expenses.length === 0) {
    return (
      <div className="expense-list-empty">
        <p>Inga utgifter för {monthName} {year}.</p>
        <p>Lägg till en utgift ovan för att komma igång.</p>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <ul className="expense-list-items">
        {expenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            isEditing={editingId === expense.id}
            onEdit={() => setEditingId(expense.id)}
            onCancelEdit={() => setEditingId(null)}
            onUpdate={async (payload) => {
              await onUpdate(expense.id, payload);
              setEditingId(null);
            }}
            onDelete={() => onDelete(expense.id)}
          />
        ))}
      </ul>
      <div className="expense-list-total">
        <span>Summa {monthName} {year}</span>
        <strong>{total.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</strong>
      </div>
    </div>
  );
}
