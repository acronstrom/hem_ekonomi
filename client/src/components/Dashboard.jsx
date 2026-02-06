import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const LOAN_SECTION_MATCH = /lån|bolån|bil|hypotek|csn/i;

const CHART_COLORS = ["#4a90d9", "#7ed56f", "#f9c74f", "#f3722c", "#e63946", "#9b59b6", "#3498db", "#1abc9c"];

function formatCurrency(n) {
  return Number(n).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";
}

export default function Dashboard({
  apiBase,
  currentMonth,
  currentYear,
  onMonthChange,
  onYearChange,
  onOpenMonth,
}) {
  const [thisMonthItems, setThisMonthItems] = useState([]);
  const [prevMonthItems, setPrevMonthItems] = useState([]);
  const [recentMonths, setRecentMonths] = useState([]);
  const [incomeItems, setIncomeItems] = useState([]);
  const [budget, setBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [newIncome, setNewIncome] = useState({ source: "", amount: "" });
  const [savingIncome, setSavingIncome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expenseView, setExpenseView] = useState("section");
  const [showSectionCharts, setShowSectionCharts] = useState(false);

  const API = `${apiBase}/api`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      try {
        const [thisRes, prevRes, incomeRes, budgetRes] = await Promise.all([
          fetch(`${API}/line-items?month=${currentMonth}&year=${currentYear}`, { credentials: "include" }),
          fetch(`${API}/line-items?month=${prevMonth}&year=${prevYear}`, { credentials: "include" }),
          fetch(`${API}/income?month=${currentMonth}&year=${currentYear}`, { credentials: "include" }),
          fetch(`${API}/budget?month=${currentMonth}&year=${currentYear}`, { credentials: "include" }),
        ]);

        if (cancelled) return;
        if (!thisRes.ok) throw new Error("Kunde inte hämta data");
        const thisData = await thisRes.json();
        const prevData = prevRes.ok ? await prevRes.json() : { items: [] };
        const incomeData = incomeRes.ok ? await incomeRes.json() : { items: [] };
        const budgetData = budgetRes.ok ? await budgetRes.json() : { budget: null };
        setThisMonthItems(thisData.items || []);
        setPrevMonthItems(prevData.items || []);
        setIncomeItems(incomeData.items || []);
        setBudget(budgetData.budget ?? null);

        const monthsToFetch = [];
        let m = currentMonth;
        let y = currentYear;
        for (let i = 0; i < 6; i++) {
          monthsToFetch.push({ month: m, year: y });
          m--;
          if (m < 1) {
            m = 12;
            y--;
          }
        }
        const recentRes = await Promise.all(
          monthsToFetch.map(({ month, year }) =>
            fetch(`${API}/line-items?month=${month}&year=${year}`, { credentials: "include" }).then((r) => r.json())
          )
        );
        if (cancelled) return;
        setRecentMonths(
          monthsToFetch.map(({ month, year }, i) => {
            const items = recentRes[i]?.items || [];
            const total = items.reduce((sum, it) => sum + Number(it.amount), 0);
            return { month, year, total, items };
          })
        );
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [API, currentMonth, currentYear]);

  const thisTotal = thisMonthItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const prevTotal = prevMonthItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const diff = thisTotal - prevTotal;
  const incomeTotal = incomeItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const savings = incomeTotal - thisTotal;
  const budgetAmount = budget ? Number(budget.amount) : null;
  const budgetRemaining = budgetAmount != null ? budgetAmount - thisTotal : null;

  const bySection = {};
  thisMonthItems.forEach((item) => {
    const s = item.section || "Övrigt";
    if (!bySection[s]) bySection[s] = 0;
    bySection[s] += Number(item.amount);
  });

  const loanTotal = thisMonthItems
    .filter((i) => LOAN_SECTION_MATCH.test(i.section || ""))
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const byCategory = {};
  thisMonthItems.forEach((item) => {
    const c = (item.category && item.category.trim()) || "—";
    if (!byCategory[c]) byCategory[c] = 0;
    byCategory[c] += Number(item.amount);
  });

  const sectionList = Object.entries(bySection).sort((a, b) => b[1] - a[1]);
  const categoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const pieData = sectionList.map(([name, amount]) => ({ name, value: amount }));
  const categoryPieData = categoryList.map(([name, amount]) => ({ name, value: amount }));

  const bySectionWithCategories = {};
  thisMonthItems.forEach((item) => {
    const s = item.section || "Övrigt";
    if (!bySectionWithCategories[s]) bySectionWithCategories[s] = {};
    const c = (item.category && item.category.trim()) || "—";
    if (!bySectionWithCategories[s][c]) bySectionWithCategories[s][c] = 0;
    bySectionWithCategories[s][c] += Number(item.amount);
  });
  const sectionChartData = Object.entries(bySectionWithCategories).map(([section, cats]) => ({
    section,
    data: Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  }));

  const barData = recentMonths.map(({ month, year, total }) => ({
    month: `${MONTHS[month - 1].slice(0, 3)} ${year}`,
    total,
    totalkr: formatCurrency(total),
  }));

  async function handleSetBudget(e) {
    e.preventDefault();
    const amount = Number(String(budgetInput).replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(amount) || amount < 0) return;
    setSavingBudget(true);
    try {
      const res = await fetch(`${API}/budget`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear, amount }),
      });
      if (!res.ok) throw new Error("Kunde inte spara budget");
      const data = await res.json();
      setBudget(data.budget);
      setBudgetInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleAddIncome(e) {
    e.preventDefault();
    const amount = Number(String(newIncome.amount).replace(/\s/g, "").replace(",", "."));
    const source = String(newIncome.source).trim();
    if (!source || Number.isNaN(amount) || amount < 0) return;
    setSavingIncome(true);
    try {
      const res = await fetch(`${API}/income`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          year: currentYear,
          source,
          amount,
        }),
      });
      if (!res.ok) throw new Error("Kunde inte spara inkomst");
      const data = await res.json();
      setIncomeItems((prev) => [...prev, data.item]);
      setNewIncome({ source: "", amount: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingIncome(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">Laddar översikt...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {(onMonthChange || onYearChange) && (
        <div className="dashboard-toolbar">
          <span className="dashboard-toolbar-label">Visa månad:</span>
          <select
            className="sheet-input dashboard-select"
            value={currentMonth}
            onChange={(e) => onMonthChange?.(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="sheet-input dashboard-select"
            value={currentYear}
            onChange={(e) => onYearChange?.(Number(e.target.value))}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}
      {error && <div className="portal-error">{error}</div>}

      <div className="dashboard-hero">
        <div className="dashboard-card dashboard-card-total">
          <span className="dashboard-card-label">Totalt denna månad</span>
          <span className="dashboard-card-value">{formatCurrency(thisTotal)}</span>
          <span className="dashboard-card-meta">
            {MONTHS[currentMonth - 1]} {currentYear}
          </span>
        </div>
        <div className="dashboard-card dashboard-card-compare">
          <span className="dashboard-card-label">Jämfört med förra månaden</span>
          <span className={`dashboard-card-value dashboard-diff ${diff >= 0 ? "positive" : "negative"}`}>
            {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
          </span>
          <span className="dashboard-card-meta">
            Förra månaden: {formatCurrency(prevTotal)}
          </span>
        </div>
        {loanTotal > 0 && (
          <div className="dashboard-card dashboard-card-loans">
            <span className="dashboard-card-label">Lån & avbetalningar</span>
            <span className="dashboard-card-value">{formatCurrency(loanTotal)}</span>
            <span className="dashboard-card-meta">Denna månad</span>
          </div>
        )}
        <div className="dashboard-card dashboard-card-income">
          <span className="dashboard-card-label">Inkomst</span>
          <span className="dashboard-card-value">{formatCurrency(incomeTotal)}</span>
          <span className="dashboard-card-meta">Denna månad</span>
          <form className="dashboard-income-form" onSubmit={handleAddIncome}>
            <input
              type="text"
              className="sheet-input dashboard-income-source"
              placeholder="Källa (t.ex. Lön)"
              value={newIncome.source}
              onChange={(e) => setNewIncome((p) => ({ ...p, source: e.target.value }))}
            />
            <input
              type="text"
              className="sheet-input dashboard-income-amount"
              placeholder="Belopp"
              value={newIncome.amount}
              onChange={(e) => setNewIncome((p) => ({ ...p, amount: e.target.value }))}
              inputMode="decimal"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingIncome}>
              {savingIncome ? "Sparar…" : "Lägg till"}
            </button>
          </form>
        </div>
        <div className="dashboard-card dashboard-card-savings">
          <span className="dashboard-card-label">Sparande / överskott</span>
          <span className={`dashboard-card-value ${savings >= 0 ? "positive" : "negative"}`}>
            {formatCurrency(savings)}
          </span>
          <span className="dashboard-card-meta">Inkomst − utgifter</span>
        </div>
        {budgetAmount != null ? (
          <div className="dashboard-card dashboard-card-budget">
            <span className="dashboard-card-label">Budget</span>
            <span className="dashboard-card-value">{formatCurrency(budgetAmount)}</span>
            <span className="dashboard-card-meta">
              Utgifter: {formatCurrency(thisTotal)}
              {budgetRemaining >= 0 ? ` · Kvar: ${formatCurrency(budgetRemaining)}` : ` · Överskriden med ${formatCurrency(-budgetRemaining)}`}
            </span>
          </div>
        ) : (
          <div className="dashboard-card dashboard-card-budget-set">
            <span className="dashboard-card-label">Sparmål denna månad</span>
            <form className="dashboard-budget-form" onSubmit={handleSetBudget}>
              <input
                type="text"
                className="sheet-input dashboard-budget-input"
                placeholder="Belopp (kr)"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                inputMode="decimal"
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingBudget}>
                {savingBudget ? "Sparar…" : "Sätt budget"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-section dashboard-by-section">
          <div className="dashboard-section-header-row">
            <h3>
              {expenseView === "section" ? "Utgifter per sektion" : "Utgifter per kategori"}
            </h3>
            <div className="dashboard-view-toggles">
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${expenseView === "section" ? "active" : ""}`}
                onClick={() => setExpenseView("section")}
              >
                Per sektion
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${expenseView === "category" ? "active" : ""}`}
                onClick={() => setExpenseView("category")}
              >
                Per kategori
              </button>
            </div>
          </div>
          {thisMonthItems.length === 0 ? (
            <p className="dashboard-empty">Inga utgifter registrerade för denna månad.</p>
          ) : (
            <>
              {expenseView === "section" && (
                <>
                  <ul className="dashboard-section-list">
                    {sectionList.map(([name, amount]) => (
                      <li key={name} className="dashboard-section-row">
                        <span className="dashboard-section-name">{name}</span>
                        <span className="dashboard-section-amount">{formatCurrency(amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {pieData.length > 0 && (
                    <div className="dashboard-chart-wrap">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {sectionList.length > 0 && (
                    <label className="dashboard-checkbox-label">
                      <input
                        type="checkbox"
                        checked={showSectionCharts}
                        onChange={(e) => setShowSectionCharts(e.target.checked)}
                      />
                      Visa diagram per sektion
                    </label>
                  )}
                  {showSectionCharts && sectionChartData.filter(({ data: d }) => d.length > 0).length > 0 && (
                    <div className="dashboard-per-section-charts">
                      {sectionChartData
                        .filter(({ data: d }) => d.length > 0)
                        .map(({ section, data }) => (
                          <div key={section} className="dashboard-section-chart-block">
                            <h4 className="dashboard-section-chart-title">{section}</h4>
                            <ResponsiveContainer width="100%" height={160}>
                              <PieChart>
                                <Pie
                                  data={data}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={55}
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                  {data.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v) => formatCurrency(v)} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
              {expenseView === "category" && (
                <>
                  <ul className="dashboard-section-list">
                    {categoryList.map(([name, amount]) => (
                      <li key={name} className="dashboard-section-row">
                        <span className="dashboard-section-name">{name}</span>
                        <span className="dashboard-section-amount">{formatCurrency(amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {categoryPieData.length > 0 && (
                    <div className="dashboard-chart-wrap">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={categoryPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {categoryPieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <button type="button" className="btn btn-primary btn-sm dashboard-cta" onClick={onOpenMonth}>
            Öppna månadsöversikt →
          </button>
        </section>

        <section className="dashboard-section dashboard-recent">
          <h3>Senaste månaderna</h3>
          {barData.length > 0 && (
            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(v), "Totalt"]} />
                  <Bar dataKey="total" fill={CHART_COLORS[0]} name="Totalt" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="dashboard-recent-table-wrap">
            <table className="dashboard-recent-table">
              <thead>
                <tr>
                  <th>Månad</th>
                  <th className="dashboard-th-amount">Totalt</th>
                </tr>
              </thead>
              <tbody>
                {recentMonths.map(({ month, year, total }) => (
                  <tr key={`${year}-${month}`}>
                    <td>{MONTHS[month - 1]} {year}</td>
                    <td className="dashboard-td-amount">{formatCurrency(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-ghost btn-sm dashboard-cta" onClick={onOpenMonth}>
            Redigera månader →
          </button>
        </section>
      </div>
    </div>
  );
}
