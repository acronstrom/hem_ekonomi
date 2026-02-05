import { useState } from "react";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

export default function MonthYearPicker({ month, year, onMonthChange, onYearChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="month-year-picker">
      <button
        type="button"
        className="month-year-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {MONTHS[month - 1]} {year}
      </button>
      {open && (
        <>
          <div className="month-year-backdrop" onClick={() => setOpen(false)} />
          <div className="month-year-dropdown">
            <div className="month-year-row">
              <label>Månad</label>
              <select
                value={month}
                onChange={(e) => {
                  onMonthChange(Number(e.target.value));
                  setOpen(false);
                }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="month-year-row">
              <label>År</label>
              <select
                value={year}
                onChange={(e) => {
                  onYearChange(Number(e.target.value));
                  setOpen(false);
                }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
