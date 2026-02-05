import { useState } from "react";

export default function CategoryManager({
  categories,
  onClose,
  onAdd,
  onRename,
  onDelete,
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    const name = newName.trim();
    if (!name) {
      setError("Ange ett kategorinamn");
      return;
    }
    try {
      await onAdd(name);
      setNewName("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRename(id) {
    setError("");
    const name = editName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    try {
      await onRename(id, name);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content category-manager" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Hantera kategorier</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Stäng">
            Stäng
          </button>
        </div>
        <p className="category-manager-desc">
          Kategorierna används i listrutan när du lägger till eller redigerar rader i månadsöversikten.
        </p>
        {error && <div className="category-manager-error">{error}</div>}
        <form onSubmit={handleAdd} className="category-manager-add">
          <input
            className="sheet-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ny kategori"
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Lägg till
          </button>
        </form>
        <ul className="category-manager-list">
          {categories.length === 0 && (
            <li className="category-manager-empty">Inga kategorier än. Lägg till en ovan.</li>
          )}
          {categories.map((cat) => (
            <li key={cat.id} className="category-manager-item">
              {editingId === cat.id ? (
                <>
                  <input
                    className="sheet-input category-manager-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Kategorinamn"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleRename(cat.id)}>
                    Spara
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                    Avbryt
                  </button>
                </>
              ) : (
                <>
                  <span className="category-manager-name">{cat.name}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditName(cat.name);
                    }}
                  >
                    Redigera
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-danger"
                    onClick={() => {
                      if (window.confirm(`Ta bort kategorin "${cat.name}"?`)) onDelete(cat.id);
                    }}
                  >
                    Ta bort
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
