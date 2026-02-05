import { useState } from "react";
import SectionBlock from "./SectionBlock";

const DEFAULT_SECTIONS = ["Fasta Räkningar", "Bolån + Bil", "Streaming"];
const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const fmt = (n) => Number(n).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function MonthlySheet({
  items,
  month,
  year,
  categories = [],
  sectionDisplayNames = {},
  customSectionNames = [],
  onAddCustomSection,
  loading,
  error,
  onAdd,
  onUpdate,
  onDelete,
  onRenameSection,
}) {
  const [showOtherSection, setShowOtherSection] = useState(false);
  const [otherSection, setOtherSection] = useState("");
  const [otherLineName, setOtherLineName] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [otherError, setOtherError] = useState("");

  const bySection = {};
  items.forEach((item) => {
    const s = item.section || "Övrigt";
    if (!bySection[s]) bySection[s] = [];
    bySection[s].push(item);
  });

  const displayValues = Object.values(sectionDisplayNames);
  const sectionOrder = [...DEFAULT_SECTIONS];
  customSectionNames
    .filter((s) => !DEFAULT_SECTIONS.includes(s) && !displayValues.includes(s))
    .forEach((s) => sectionOrder.push(s));
  Object.keys(bySection)
    .filter((s) => !DEFAULT_SECTIONS.includes(s) && !displayValues.includes(s) && !sectionOrder.includes(s))
    .sort()
    .forEach((s) => sectionOrder.push(s));

  const grandTotal = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const monthName = MONTHS[month - 1];

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
      setOtherSection("");
      setOtherLineName("");
      setOtherAmount("");
      setShowOtherSection(false);
    } catch (err) {
      setOtherError(err.message || "Kunde inte lägga till");
    }
  }

  function handleAddEmptySection() {
    setOtherError("");
    const sectionName = otherSection.trim();
    if (!sectionName) {
      setOtherError("Ange sektionsnamn");
      return;
    }
    if (onAddCustomSection) {
      onAddCustomSection(sectionName);
      setOtherSection("");
      setOtherLineName("");
      setOtherAmount("");
      setShowOtherSection(false);
    }
  }

  if (loading) {
    return <div className="portal-loading">Laddar månadsdata...</div>;
  }

  return (
    <div className="monthly-sheet">
      {error && <div className="portal-error">{error}</div>}

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
            onAdd={(payload) => onAdd({ ...payload, section: displayName, month, year })}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onRenameSection={onRenameSection}
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
            <button type="submit" className="btn btn-primary btn-sm">
              {otherLineName.trim() && otherAmount ? "Lägg till rad" : "Skapa tom sektion"}
            </button>
            {onAddCustomSection && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleAddEmptySection}
              >
                Skapa tom sektion
              </button>
            )}
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

      {items.length > 0 && (
        <div className="sheet-grand-total">
          <span>Totalt {monthName} {year}</span>
          <strong>{fmt(grandTotal)} kr</strong>
        </div>
      )}
    </div>
  );
}
