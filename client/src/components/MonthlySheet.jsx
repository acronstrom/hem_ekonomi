import { useState } from "react";
import SectionBlock from "./SectionBlock";

const DEFAULT_SECTIONS = ["Fasta Räkningar", "Bolån + Bil", "Streaming"];
const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const fmt = (n) => Number(n).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function isUtlagg(item) {
  const c = (item.category && item.category.trim()) || "";
  const s = (item.section && item.section.trim()) || "";
  return c === "Utlägg" && s.toLowerCase().includes("kreditkort");
}
function itemAmount(item) {
  return isUtlagg(item) ? -Number(item.amount) : Number(item.amount);
}

export default function MonthlySheet({
  items,
  month,
  year,
  categories = [],
  sectionDisplayNames = {},
  customSectionNames = [],
  cardSectionNames = [],
  onAddCustomSection,
  onAddCardSection,
  onBulkAdd,
  loading,
  error,
  onAdd,
  onUpdate,
  onDelete,
  onRenameSection,
  onDeleteSection,
  onClearSection,
}) {
  const [showOtherSection, setShowOtherSection] = useState(false);
  const [otherSection, setOtherSection] = useState("");
  const [otherLineName, setOtherLineName] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [otherIsCardSection, setOtherIsCardSection] = useState(false);
  const [otherError, setOtherError] = useState("");
  const [amountFilterMin, setAmountFilterMin] = useState("");
  const [amountFilterMax, setAmountFilterMax] = useState("");

  const minVal = amountFilterMin === "" ? null : parseFloat(String(amountFilterMin).replace(",", "."));
  const maxVal = amountFilterMax === "" ? null : parseFloat(String(amountFilterMax).replace(",", "."));
  const filteredItems =
    (minVal == null || !Number.isNaN(minVal)) && (maxVal == null || !Number.isNaN(maxVal))
      ? items.filter((item) => {
          const a = Number(item.amount);
          if (minVal != null && !Number.isNaN(minVal) && a < minVal) return false;
          if (maxVal != null && !Number.isNaN(maxVal) && a > maxVal) return false;
          return true;
        })
      : items;

  const bySection = {};
  filteredItems.forEach((item) => {
    const s = item.section || "Övrigt";
    if (!bySection[s]) bySection[s] = [];
    bySection[s].push(item);
  });

  const displayValues = Object.values(sectionDisplayNames);
  const hasItems = (s) => (bySection[sectionDisplayNames[s] || s] || []).length > 0;
  const sectionOrder = [...DEFAULT_SECTIONS]
    .filter((s) => hasItems(s) || customSectionNames.includes(s));
  customSectionNames
    .filter((s) => !DEFAULT_SECTIONS.includes(s) && !displayValues.includes(s))
    .forEach((s) => sectionOrder.push(s));
  Object.keys(bySection)
    .filter((s) => !DEFAULT_SECTIONS.includes(s) && !displayValues.includes(s) && !sectionOrder.includes(s))
    .sort()
    .forEach((s) => sectionOrder.push(s));

  const grandTotal = filteredItems.reduce((sum, i) => sum + itemAmount(i), 0);
  const monthName = MONTHS[month - 1];
  const hasAmountFilter = (minVal != null && !Number.isNaN(minVal)) || (maxVal != null && !Number.isNaN(maxVal));

  async function handleAddOther(e) {
    e.preventDefault();
    setOtherError("");
    const sectionName = otherSection.trim();
    if (!sectionName) {
      setOtherError("Ange sektionsnamn");
      return;
    }
    const num = parseFloat(String(otherAmount).replace(",", "."));
    const hasValidAmount = !Number.isNaN(num) && num >= 0;
    const hasLineName = otherLineName.trim().length > 0;

    try {
      if (hasLineName && hasValidAmount) {
        await onAdd({
          month,
          year,
          section: sectionName,
          lineName: otherLineName.trim(),
          amount: num,
        });
      } else if (onAddCustomSection) {
        onAddCustomSection(sectionName);
      } else {
        setOtherError("Ange benämning och belopp för att lägga till en rad.");
        return;
      }
      if (otherIsCardSection && onAddCardSection) await onAddCardSection(sectionName);
      setOtherSection("");
      setOtherLineName("");
      setOtherAmount("");
      setOtherIsCardSection(false);
      setShowOtherSection(false);
    } catch (err) {
      setOtherError(err.message || "Kunde inte lägga till");
    }
  }

  if (loading) {
    return <div className="portal-loading">Laddar månadsdata...</div>;
  }

  return (
    <div className="monthly-sheet">
      {error && <div className="portal-error">{error}</div>}

      {items.length > 0 && (
        <div className="sheet-amount-filter">
          <span className="sheet-amount-filter-label">Filtrera belopp:</span>
          <input
            type="text"
            inputMode="decimal"
            className="sheet-input sheet-amount-filter-input"
            placeholder="Min kr"
            value={amountFilterMin}
            onChange={(e) => setAmountFilterMin(e.target.value)}
            title="Visa endast rader med belopp minst detta (lämna tomt för ingen gräns)"
          />
          <span className="sheet-amount-filter-sep">–</span>
          <input
            type="text"
            inputMode="decimal"
            className="sheet-input sheet-amount-filter-input"
            placeholder="Max kr"
            value={amountFilterMax}
            onChange={(e) => setAmountFilterMax(e.target.value)}
            title="Visa endast rader med belopp högst detta (lämna tomt för ingen gräns)"
          />
          {hasAmountFilter && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setAmountFilterMin("");
                setAmountFilterMax("");
              }}
            >
              Rensa filter
            </button>
          )}
          {hasAmountFilter && (
            <span className="sheet-amount-filter-hint">
              Visar {filteredItems.length} av {items.length} poster
            </span>
          )}
        </div>
      )}

      {sectionOrder.map((section) => {
        const displayName = sectionDisplayNames[section] || section;
        const blockItems = bySection[displayName] || [];
        return (
          <SectionBlock
            key={section}
            section={section}
            displayName={displayName}
            items={blockItems}
            month={month}
            year={year}
            categories={categories}
            isCardSection={cardSectionNames.includes(displayName)}
            onBulkAdd={onBulkAdd}
            onAdd={(payload) => onAdd({ ...payload, section: displayName, month, year })}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onRenameSection={onRenameSection}
            onDeleteSection={onDeleteSection}
            onClearSection={onClearSection}
          />
        );
      })}

      {showOtherSection ? (
        <div className="sheet-section sheet-other-form">
          <div className="sheet-section-header">
            <h3>Ny sektion</h3>
          </div>
          {otherError && <div className="sheet-inline-error sheet-other-error">{otherError}</div>}
          <form onSubmit={handleAddOther} className="sheet-other-form-inner">
            <input
              className="sheet-input"
              value={otherSection}
              onChange={(e) => setOtherSection(e.target.value)}
              placeholder="Sektionsnamn (t.ex. Försäkringar)"
              required
            />
            <input
              className="sheet-input"
              value={otherLineName}
              onChange={(e) => setOtherLineName(e.target.value)}
              placeholder="Benämning (valfritt för tom sektion)"
            />
            <input
              type="number"
              step="1"
              min="0"
              className="sheet-input sheet-input-amount"
              value={otherAmount}
              onChange={(e) => setOtherAmount(e.target.value)}
              placeholder="Belopp"
            />
            <label className="sheet-other-card-label">
              <input
                type="checkbox"
                checked={otherIsCardSection}
                onChange={(e) => setOtherIsCardSection(e.target.checked)}
              />
              Kortsektion (CSV-import)
            </label>
            <button type="submit" className="btn btn-primary btn-sm">
              {otherLineName.trim() && otherAmount ? "Lägg till rad" : "Skapa tom sektion"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowOtherSection(false);
                setOtherError("");
              }}
            >
              Avbryt
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-sm sheet-add-section"
          onClick={() => setShowOtherSection(true)}
        >
          + Lägg till annan sektion
        </button>
      )}

      {filteredItems.length > 0 && (
        <div className="sheet-grand-total">
          <span>Totalt {monthName} {year}{hasAmountFilter ? " (filtrerat)" : ""}</span>
          <strong>{fmt(grandTotal)} kr</strong>
        </div>
      )}
    </div>
  );
}
