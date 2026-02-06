import { Fragment, useState, useRef } from "react";

const fmt = (n) => Number(n).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const MONTHS = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

function formatCardMetaTitle(meta) {
  if (!meta || typeof meta !== "object") return "";
  const parts = [];
  if (meta.transactionDate) parts.push(`Datum: ${meta.transactionDate}`);
  if (meta.bookingDate) parts.push(`Bokföringsdag: ${meta.bookingDate}`);
  if (meta.currency) parts.push(`Valuta: ${meta.currency}`);
  if (meta.transactionType) parts.push(`Typ: ${meta.transactionType}`);
  if (meta.originalAmount != null) parts.push(`Ursprungligt belopp: ${meta.originalAmount}`);
  if (meta.originalCurrency) parts.push(`Ursprunglig valuta: ${meta.originalCurrency}`);
  if (meta.city) parts.push(`Stad: ${meta.city}`);
  if (meta.country) parts.push(`Land: ${meta.country}`);
  if (meta.exchangeRate != null) parts.push(`Växelkurs: ${meta.exchangeRate}`);
  return parts.join("\n");
}

// Bank export CSV: semicolon- or tab-separated, fields may be quoted (e.g. Nordea)
// Columns: Datum för kontohändelse(0), Bokföringsdag(1), Rubrik(2), Belopp(3), Valuta(4), ...
function unquote(s) {
  if (typeof s !== "string") return "";
  return s.trim().replace(/^"|"$/g, "");
}
function parseBankCsv(text, filterMonth, filterYear) {
  text = text.replace(/^\uFEFF/, ""); // BOM
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[1].includes(";") ? ";" : "\t";
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].split(delimiter);
    const cols = raw.map((c) => unquote(c));
    if (cols.length < 4) continue;
    const transactionDate = cols[0] || "";
    const bookingDate = cols[1] || "";
    const rubrik = cols[2] || "";
    const beloppStr = (cols[3] || "0").replace(/\s/g, "").replace(",", ".");
    const valuta = cols[4] || "";
    const transactionType = cols[5] || "";
    const originalAmount = (cols[6] || "").replace(/\s/g, "").replace(",", ".");
    const originalCurrency = cols[7] || "";
    const city = (cols[8] || "").replace(/^""$/, "");
    const country = (cols[9] || "").replace(/^""$/, "");
    const exchangeRate = (cols[10] || "").replace(",", ".");
    if (!rubrik) continue;
    const rawAmount = parseFloat(beloppStr);
    if (Number.isNaN(rawAmount) || rawAmount >= 0) continue; // only expenditures (negative); skip INBETALNING / payments
    const amount = Math.abs(rawAmount);
    const meta = {
      transactionDate: transactionDate || undefined,
      bookingDate: bookingDate || undefined,
      currency: valuta || undefined,
      transactionType: transactionType || undefined,
      originalAmount: originalAmount ? parseFloat(originalAmount) : undefined,
      originalCurrency: originalCurrency || undefined,
      city: city || undefined,
      country: country || undefined,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined,
    };
    rows.push({ lineName: rubrik, amount, meta: Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined && v !== "")) });
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
  const [csvImportCategory, setCsvImportCategory] = useState("");
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
        setCsvError("Inga giltiga rader hittades. Kontrollera att filen har minst 4 kolumner (Datum, Bokföringsdag, Rubrik, Belopp) separerade med semikolon (;) eller tabb.");
        return;
      }
      const category = csvImportCategory.trim() || undefined;
      const items = parsed.map((r) => ({ ...r, category }));
      await onBulkAdd(name, items);
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
                  <select
                    className="sheet-input sheet-select sheet-csv-category"
                    value={csvImportCategory}
                    onChange={(e) => setCsvImportCategory(e.target.value)}
                    title="Kategori för importerade rader"
                    aria-label="Kategori för import"
                  >
                    <option value="">Kategori (valfritt)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm sheet-header-csv-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={csvUploading}
                    title="Importera från bankens CSV (semikolon: Datum;Rubrik;Belopp;Valuta;…)"
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
            {isCardSection && <th className="sheet-th-date">Datum</th>}
            <th className="sheet-th-category">Kategori</th>
            <th className="sheet-th-amount">Belopp</th>
            <th className="sheet-th-actions" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && !adding && (
            <tr>
              <td colSpan={isCardSection ? 5 : 4} className="sheet-empty-row">
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
                  {isCardSection && <td className="sheet-td-date">{item.meta?.transactionDate || "—"}</td>}
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
                  <td>
                    <span className="sheet-line-name">{item.lineName}</span>
                    {isCardSection && item.meta && (item.meta.currency || item.meta.city) && (
                      <span className="sheet-line-meta" title={formatCardMetaTitle(item.meta)}>
                        {[item.meta.currency, item.meta.city].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  {isCardSection && (
                    <td className="sheet-td-date" title={item.meta ? formatCardMetaTitle(item.meta) : undefined}>
                      {item.meta?.transactionDate || "—"}
                    </td>
                  )}
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
                  <td colSpan={isCardSection ? 5 : 4}>Kategori: {cat}</td>
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
                        {isCardSection && <td className="sheet-td-date">{item.meta?.transactionDate || "—"}</td>}
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
                        <td>
                          <span className="sheet-line-name">{item.lineName}</span>
                          {isCardSection && item.meta && (item.meta.currency || item.meta.city) && (
                            <span className="sheet-line-meta" title={formatCardMetaTitle(item.meta)}>
                              {[item.meta.currency, item.meta.city].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </td>
                        {isCardSection && (
                          <td className="sheet-td-date" title={item.meta ? formatCardMetaTitle(item.meta) : undefined}>
                            {item.meta?.transactionDate || "—"}
                          </td>
                        )}
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
                  <td colSpan={isCardSection ? 3 : 2}>Summa {cat}</td>
                  <td className="sheet-td-amount sheet-numeric">{fmt(groupSum)} kr</td>
                  <td />
                </tr>
              </Fragment>
            );
          })}
          {adding && (
            <tr className="sheet-row sheet-row-add">
              <td colSpan={isCardSection ? 5 : 4}>
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
