import { Fragment, useState, useRef } from "react";

const fmt = (n) => Number(n).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const MONTHS = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

// Bank export CSV: tab-separated, columns Datum för kontohändelse(0), Bokföringsdag(1), Rubrik(2), Belopp(3), ...
function parseBankCsv(text, filterMonth, filterYear) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const dateStr = (cols[0] || "").trim();
    const rubrik = (cols[2] || "").trim();
    const beloppStr = (cols[3] || "0").trim().replace(",", ".");
    if (!rubrik) continue;
    const amount = Math.abs(parseFloat(beloppStr));
    if (Number.isNaN(amount) || amount <= 0) continue;
    let year = filterYear;
    let month = filterMonth;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m] = dateStr.split("-").map(Number);
      year = y;
      month = m;
    }
    if (month === filterMonth && year === filterYear) rows.push({ lineName: rubrik, amount });
  }
  return rows;
}

export default function SectionBlock({
  section,
  displayName,
  items,
  month,
  year,
  categories = [],
  isCardSection = false,
  onBulkAdd,
  onAdd,
  onUpdate,
  onDelete,
  onRenameSection,
  onDeleteSection,
  onClearSection,
}) {
  const name = displayName ?? section;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerValue, setHeaderValue] = useState(name);
  const [lineName, setLineName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [error, setError] = useState("");
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef(null);

  const subtotal = items.reduce((sum, i) => sum + Number(i.amount), 0);

  const byCategory = items.reduce((acc, item) => {
    const cat = item.category?.trim() || "—";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
  const categoryOrder = Object.keys(byCategory).sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)));

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    const num = parseFloat(amount?.replace(",", "."));
    if (!lineName.trim()) {
      setError("Ange ett namn");
      return;
    }
    if (isNaN(num) || num < 0) {
      setError("Ange ett giltigt belopp");
      return;
    }
    try {
      await onAdd({
        section: name,
        lineName: lineName.trim(),
        amount: num,
        category: category.trim() || undefined,
      });
      setLineName("");
      setAmount("");
      setCategory("");
      setAdding(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdate(id, payload) {
    setError("");
    try {
      await onUpdate(id, payload);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRenameSection() {
    const newName = headerValue.trim();
    if (!newName || newName === name) {
      setEditingHeader(false);
      setHeaderValue(name);
      return;
    }
    if (!onRenameSection) return;
    setError("");
    try {
      await onRenameSection(section, newName);
      setEditingHeader(false);
      setHeaderValue(newName);
    } catch (err) {
      setError(err.message || "Kunde inte spara");
    }
  }

  async function handleCsvFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onBulkAdd) return;
    setCsvError("");
    setCsvUploading(true);
    try {
      const text = await file.text();
      const parsed = parseBankCsv(text, month, year);
      if (parsed.length === 0) {
        setCsvError("Inga rader för denna månad i filen, eller ogiltigt format (tab-separerad: Datum, Rubrik, Belopp).");
        return;
      }
      await onBulkAdd(name, parsed);
    } catch (err) {
      setCsvError(err.message || "Kunde inte läsa filen");
    } finally {
      setCsvUploading(false);
    }
  }

  return (
    <div className="sheet-section">
      <div className="sheet-section-header">
        {editingHeader ? (
          <div className="sheet-section-header-edit">
            {error && <span className="sheet-header-edit-error">{error}</span>}
            <input
              className="sheet-input sheet-header-input"
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              placeholder="Sektionsnamn"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSection();
                if (e.key === "Escape") {
                  setEditingHeader(false);
                  setHeaderValue(name);
                  setError("");
                }
              }}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={handleRenameSection}>
              Spara
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingHeader(false);
                setHeaderValue(name);
                setError("");
              }}
            >
              Avbryt
            </button>
          </div>
        ) : (
          <>
            <h3 className="sheet-section-title">
              {name}
              {isCardSection && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="sheet-csv-input-hidden"
                    onChange={handleCsvFile}
                    aria-label="Ladda upp CSV"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm sheet-header-csv-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={csvUploading}
                    title="Importera utgifter från bankens CSV-export (tab-separerad: Datum, Rubrik, Belopp)"
                  >
                    {csvUploading ? "Laddar upp…" : "Ladda upp CSV"}
                  </button>
                </>
              )}
              {onRenameSection && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm sheet-header-edit-btn"
                  onClick={() => {
                    setHeaderValue(name);
                    setEditingHeader(true);
                  }}
                  title="Ändra sektionsnamn"
                  aria-label="Ändra sektionsnamn"
                >
                  Ändra
                </button>
              )}
              {onClearSection && items.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm sheet-header-clear-btn"
                  onClick={() => {
                    const monthName = MONTHS[month - 1];
                    const msg = `Rensa alla ${items.length} rad(er) i sektionen "${name}" för ${monthName} ${year}? Detta kan inte ångras.`;
                    if (window.confirm(msg)) onClearSection(displayName);
                  }}
                  title="Rensa alla rader i sektionen"
                  aria-label="Rensa sektion"
                >
                  Rensa sektion
                </button>
              )}
              {onDeleteSection && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-danger sheet-header-delete-btn"
                  onClick={() => {
                    const msg = items.length > 0
                      ? `Ta bort sektionen "${name}" och alla ${items.length} rad(er)?`
                      : `Ta bort sektionen "${name}"?`;
                    if (window.confirm(msg)) onDeleteSection(displayName);
                  }}
                  title="Ta bort sektion"
                  aria-label="Ta bort sektion"
                >
                  Ta bort sektion
                </button>
              )}
            </h3>
            <span className="sheet-section-subtotal">
              {fmt(subtotal)} kr
            </span>
          </>
        )}
      </div>
      {csvError && <div className="sheet-inline-error sheet-csv-error">{csvError}</div>}
      {!editingHeader && items.length > 0 && (
        <div className="sheet-section-view-toggle">
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${!groupByCategory ? "active" : ""}`}
            onClick={() => setGroupByCategory(false)}
          >
            Visa som lista
          </button>
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${groupByCategory ? "active" : ""}`}
            onClick={() => setGroupByCategory(true)}
          >
            Gruppera per kategori
          </button>
        </div>
      )}
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Benämning</th>
            <th className="sheet-th-category">Kategori</th>
            <th className="sheet-th-amount">Belopp</th>
            <th className="sheet-th-actions" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && !adding && (
            <tr>
              <td colSpan={4} className="sheet-empty-row">
                Inga rader. Klicka på &quot;Lägg till rad&quot; nedan.
              </td>
            </tr>
          )}
          {items.length > 0 && !groupByCategory && items.map((item) => (
            <tr key={item.id} className="sheet-row">
              {editingId === item.id ? (
                <>
                  <td>
                    <input
                      className="sheet-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Benämning"
                    />
                  </td>
                  <td className="sheet-td-category">
                    <select
                      className="sheet-input sheet-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="sheet-td-amount">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="sheet-input sheet-input-amount"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="sheet-td-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Avbryt
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        handleUpdate(item.id, {
                          lineName: editName.trim(),
                          amount: parseFloat(editAmount) || 0,
                          category: editCategory.trim() || null,
                        })
                      }
                    >
                      Spara
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td>{item.lineName}</td>
                  <td className="sheet-td-category sheet-category-cell">{item.category || "—"}</td>
                  <td className="sheet-td-amount sheet-numeric">{fmt(item.amount)} kr</td>
                  <td className="sheet-td-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditName(item.lineName);
                        setEditAmount(String(item.amount));
                        setEditCategory(item.category || "");
                      }}
                    >
                      Redigera
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-danger"
                      onClick={() => {
                        if (window.confirm("Ta bort raden?")) onDelete(item.id);
                      }}
                    >
                      Ta bort
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {items.length > 0 && groupByCategory && categoryOrder.map((cat) => {
            const groupItems = byCategory[cat];
            const groupSum = groupItems.reduce((s, i) => s + Number(i.amount), 0);
            return (
              <Fragment key={cat}>
                <tr className="sheet-category-group-header">
                  <td colSpan={4}>Kategori: {cat}</td>
                </tr>
                {groupItems.map((item) => (
                  <tr key={item.id} className="sheet-row">
                    {editingId === item.id ? (
                      <>
                        <td>
                          <input
                            className="sheet-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Benämning"
                          />
                        </td>
                        <td className="sheet-td-category">
                          <select
                            className="sheet-input sheet-select"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                          >
                            <option value="">—</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="sheet-td-amount">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            className="sheet-input sheet-input-amount"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="sheet-td-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Avbryt</button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              handleUpdate(item.id, {
                                lineName: editName.trim(),
                                amount: parseFloat(editAmount) || 0,
                                category: editCategory.trim() || null,
                              })
                            }
                          >
                            Spara
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{item.lineName}</td>
                        <td className="sheet-td-category sheet-category-cell">{item.category || "—"}</td>
                        <td className="sheet-td-amount sheet-numeric">{fmt(item.amount)} kr</td>
                        <td className="sheet-td-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditName(item.lineName);
                              setEditAmount(String(item.amount));
                              setEditCategory(item.category || "");
                            }}
                          >
                            Redigera
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-danger"
                            onClick={() => {
                              if (window.confirm("Ta bort raden?")) onDelete(item.id);
                            }}
                          >
                            Ta bort
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="sheet-category-group-subtotal">
                  <td colSpan={2}>Summa {cat}</td>
                  <td className="sheet-td-amount sheet-numeric">{fmt(groupSum)} kr</td>
                  <td />
                </tr>
              </Fragment>
            );
          })}
          {adding && (
            <tr className="sheet-row sheet-row-add">
              <td colSpan={4}>
                {error && <div className="sheet-inline-error">{error}</div>}
                <form onSubmit={handleAdd} className="sheet-add-form">
                  <input
                    className="sheet-input"
                    value={lineName}
                    onChange={(e) => setLineName(e.target.value)}
                    placeholder="T.ex. Telia, Netflix"
                    autoFocus
                  />
                  <select
                    className="sheet-input sheet-select sheet-select-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Kategori (valfritt)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="sheet-input sheet-input-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Belopp"
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Lägg till
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setAdding(false);
                      setLineName("");
                      setAmount("");
                      setCategory("");
                      setError("");
                    }}
                  >
                    Avbryt
                  </button>
                </form>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="sheet-section-total">
        <strong>Summa {name}</strong>
        <strong>{fmt(subtotal)} kr</strong>
      </div>
      {!adding && (
        <button
          type="button"
          className="btn btn-ghost btn-sm sheet-add-row"
          onClick={() => setAdding(true)}
        >
          + Lägg till rad
        </button>
      )}
    </div>
  );
}
