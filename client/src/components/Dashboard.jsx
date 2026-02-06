import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
  const [newIncome, setNewIncome] = useState({ source: "", amount: "", member: "" });
  const [savingIncome, setSavingIncome] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expenseView, setExpenseView] = useState("section");
  const [showSectionCharts, setShowSectionCharts] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

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

  // Per-member income for overview
  const incomeByMember = {};
  incomeItems.forEach((i) => {
    const name = (i.member && String(i.member).trim()) || "—";
    if (!incomeByMember[name]) incomeByMember[name] = 0;
    incomeByMember[name] += Number(i.amount);
  });
  const memberSummaryList = Object.entries(incomeByMember).sort((a, b) => b[1] - a[1]);
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

  // Family members from income – "Per kort/medlem" shows sections with those names
  const knownMemberNames = [...new Set(incomeItems.map((i) => i.member).filter(Boolean))];
  const memberList = knownMemberNames
    .map((m) => [m, bySection[m] ?? 0])
    .sort((a, b) => b[1] - a[1]);
  const memberPieData = memberList.filter(([, amount]) => amount > 0).map(([name, amount]) => ({ name, value: amount }));

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
      const member = String(newIncome.member || "").trim();
      const res = await fetch(`${API}/income`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          year: currentYear,
          source,
          amount,
          ...(member ? { member } : {}),
        }),
      });
      if (!res.ok) throw new Error("Kunde inte spara inkomst");
      const data = await res.json();
      setIncomeItems((prev) => [...prev, data.item]);
      setNewIncome({ source: "", amount: "", member: "" });
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
        <div className="dashboard-card dashboard-card-total dashboard-card-expandable">
          <button type="button" className="dashboard-card-expand-btn" onClick={() => setExpandedCard("total")} title="Visa större" aria-label="Expandera" />
          <span className="dashboard-card-label">Totalt denna månad</span>
          <span className="dashboard-card-value">{formatCurrency(thisTotal)}</span>
          <span className="dashboard-card-meta">
            {MONTHS[currentMonth - 1]} {currentYear}
          </span>
        </div>
        <div className="dashboard-card dashboard-card-compare dashboard-card-expandable">
          <button type="button" className="dashboard-card-expand-btn" onClick={() => setExpandedCard("compare")} title="Visa större" aria-label="Expandera" />
          <span className="dashboard-card-label">Jämfört med förra månaden</span>
          <span className={`dashboard-card-value dashboard-diff ${diff >= 0 ? "positive" : "negative"}`}>
            {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
          </span>
          <span className="dashboard-card-meta">
            Förra månaden: {formatCurrency(prevTotal)}
          </span>
        </div>
        {loanTotal > 0 && (
          <div className="dashboard-card dashboard-card-loans dashboard-card-expandable">
            <button type="button" className="dashboard-card-expand-btn" onClick={() => setExpandedCard("loans")} title="Visa större" aria-label="Expandera" />
            <span className="dashboard-card-label">Lån & avbetalningar</span>
            <span className="dashboard-card-value">{formatCurrency(loanTotal)}</span>
            <span className="dashboard-card-meta">Denna månad</span>
          </div>
        )}
        <div className="dashboard-card dashboard-card-income dashboard-card-expandable">
          <button type="button" className="dashboard-card-expand-btn" onClick={() => setExpandedCard("income")} title="Visa större" aria-label="Expandera" />
          <span className="dashboard-card-label">Inkomst</span>
          <span className="dashboard-card-value">{formatCurrency(incomeTotal)}</span>
          <span className="dashboard-card-meta">Denna månad</span>
          {memberSummaryList.length > 0 && (
            <ul className="dashboard-income-by-member">
              {memberSummaryList.map(([name, amount]) => (
                <li key={name}>
                  <span className="dashboard-income-member-name">{name}</span>
                  <span className="dashboard-income-member-amount">{formatCurrency(amount)}</span>
                </li>
              ))}
            </ul>
          )}
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
              className="sheet-input dashboard-income-member"
              placeholder="Medlem (valfritt)"
              value={newIncome.member}
              onChange={(e) => setNewIncome((p) => ({ ...p, member: e.target.value }))}
              title="Familjemedlem som har denna inkomst"
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
        <div className="dashboard-card dashboard-card-savings dashboard-card-expandable">
          <button type="button" className="dashboard-card-expand-btn" onClick={() => setExpandedCard("savings")} title="Visa större" aria-label="Expandera" />
          <span className="dashboard-card-label">Sparande / överskott</span>
          <span className={`dashboard-card-value ${savings >= 0 ? "positive" : "negative"}`}>
            {formatCurrency(savings)}
          </span>
          <span className="dashboard-card-meta">Inkomst − utgifter</span>
        </div>
        {budgetAmount != null ? (
          <div className="dashboard-card dashboard-card-budget dashboard-card-expandable">
            <button type="button" className="dashboard-card-expand-btn" onClick={() => setExpandedCard("budget")} title="Visa större" aria-label="Expandera" />
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
        <section className="dashboard-section dashboard-by-section dashboard-section-expandable">
          <div className="dashboard-section-header-row">
            <h3>
              {expenseView === "section" && "Utgifter per sektion"}
              {expenseView === "category" && "Utgifter per kategori"}
              {expenseView === "member" && "Utgifter per kort/medlem"}
            </h3>
            <div className="dashboard-section-header-actions">
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
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${expenseView === "member" ? "active" : ""}`}
                onClick={() => setExpenseView("member")}
              >
                Per kort/medlem
              </button>
            </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpandedCard("by-section")} title="Visa större">
                Expandera
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
              {expenseView === "member" && (
                <>
                  <p className="dashboard-member-desc">
                    Skapa en sektion per person i månadsöversikten (samma namn som vid inkomst, t.ex. Andreas, Anna). Här visas summan per sådan sektion.
                  </p>
                  {knownMemberNames.length === 0 && (
                    <p className="dashboard-empty dashboard-member-empty">Lägg till inkomst med medlemsnamn (Inkomst-kortet) så dyker personerna upp här. Skapa sedan motsvarande sektioner i månadsöversikten.</p>
                  )}
                  <ul className="dashboard-section-list">
                    {memberList.map(([name, amount]) => (
                      <li key={name} className="dashboard-section-row">
                        <span className="dashboard-section-name">{name}</span>
                        <span className="dashboard-section-amount">{formatCurrency(amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {memberPieData.length > 0 && (
                    <div className="dashboard-chart-wrap">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={memberPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {memberPieData.map((_, i) => (
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

        <section className="dashboard-section dashboard-recent dashboard-section-expandable">
          <div className="dashboard-section-header-row">
            <h3>Senaste månaderna</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpandedCard("recent")} title="Visa större">
              Expandera
            </button>
          </div>
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

      {expandedCard && (
        <div className="dashboard-expanded-overlay" onClick={() => setExpandedCard(null)} role="dialog" aria-modal="true" aria-label="Expanderad vy">
          <div
            className={`dashboard-expanded-content ${expandedCard === "by-section" || expandedCard === "recent" ? "dashboard-expanded-content--charts" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="dashboard-expanded-close" onClick={() => setExpandedCard(null)} aria-label="Stäng">
              ×
            </button>
            {expandedCard === "total" && (
              <div className="dashboard-expanded-card">
                <h3>Totalt denna månad</h3>
                <p className="dashboard-expanded-value">{formatCurrency(thisTotal)}</p>
                <p className="dashboard-expanded-meta">{MONTHS[currentMonth - 1]} {currentYear}</p>
              </div>
            )}
            {expandedCard === "compare" && (
              <div className="dashboard-expanded-card">
                <h3>Jämfört med förra månaden</h3>
                <p className={`dashboard-expanded-value ${diff >= 0 ? "positive" : "negative"}`}>
                  {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                </p>
                <p className="dashboard-expanded-meta">Förra månaden: {formatCurrency(prevTotal)}</p>
              </div>
            )}
            {expandedCard === "loans" && (
              <div className="dashboard-expanded-card">
                <h3>Lån & avbetalningar</h3>
                <p className="dashboard-expanded-value">{formatCurrency(loanTotal)}</p>
                <p className="dashboard-expanded-meta">Denna månad</p>
              </div>
            )}
            {expandedCard === "income" && (
              <div className="dashboard-expanded-card">
                <h3>Inkomst</h3>
                <p className="dashboard-expanded-value">{formatCurrency(incomeTotal)}</p>
                <p className="dashboard-expanded-meta">Denna månad</p>
                {memberSummaryList.length > 0 && (
                  <div className="dashboard-expanded-members">
                    <h4 className="dashboard-expanded-members-title">Per familjemedlem</h4>
                    <ul className="dashboard-expanded-list dashboard-expanded-list-members">
                      {memberSummaryList.map(([name, amount]) => (
                        <li key={name}><span>{name}</span><span>{formatCurrency(amount)}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {incomeItems.length > 0 && (
                  <>
                    <h4 className="dashboard-expanded-detail-title">Alla poster</h4>
                    <ul className="dashboard-expanded-list">
                      {incomeItems.map((i) => (
                        <li key={i.id}>
                          <span>{i.source}{i.member ? ` · ${i.member}` : ""}</span>
                          <span>{formatCurrency(i.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {expandedCard === "savings" && (
              <div className="dashboard-expanded-card">
                <h3>Sparande / överskott</h3>
                <p className={`dashboard-expanded-value ${savings >= 0 ? "positive" : "negative"}`}>{formatCurrency(savings)}</p>
                <p className="dashboard-expanded-meta">Inkomst − utgifter</p>
                <p className="dashboard-expanded-meta">Inkomst: {formatCurrency(incomeTotal)} · Utgifter: {formatCurrency(thisTotal)}</p>
              </div>
            )}
            {expandedCard === "budget" && (
              <div className="dashboard-expanded-card">
                <h3>Budget</h3>
                <p className="dashboard-expanded-value">{formatCurrency(budgetAmount)}</p>
                <p className="dashboard-expanded-meta">
                  Utgifter: {formatCurrency(thisTotal)}
                  {budgetRemaining >= 0 ? ` · Kvar: ${formatCurrency(budgetRemaining)}` : ` · Överskriden med ${formatCurrency(-budgetRemaining)}`}
                </p>
              </div>
            )}
            {expandedCard === "by-section" && (
              <div className="dashboard-expanded-section dashboard-expanded-charts-view">
                <h3>
                  {expenseView === "section" && "Utgifter per sektion"}
                  {expenseView === "category" && "Utgifter per kategori"}
                  {expenseView === "member" && "Utgifter per kort/medlem"}
                  {" · "}{MONTHS[currentMonth - 1]} {currentYear}
                </h3>
                <p className="dashboard-expanded-total">Totalt {formatCurrency(thisTotal)}</p>
                <div className="dashboard-expanded-charts-grid">
                  {expenseView === "section" && (
                    <>
                      <ul className="dashboard-expanded-detail-list">
                        {sectionList.map(([name, amount]) => {
                          const pct = thisTotal > 0 ? ((amount / thisTotal) * 100).toFixed(1) : "0";
                          return (
                            <li key={name} className="dashboard-expanded-detail-row">
                              <span className="dashboard-expanded-detail-name">{name}</span>
                              <span className="dashboard-expanded-detail-amount">{formatCurrency(amount)}</span>
                              <span className="dashboard-expanded-detail-pct">{pct}%</span>
                            </li>
                          );
                        })}
                      </ul>
                      {pieData.length > 0 && (
                        <div className="dashboard-expanded-chart-main">
                          <ResponsiveContainer width="100%" height={380}>
                            <PieChart>
                              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={140} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v) => formatCurrency(v)} />
                              <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 16 }} formatter={(value, entry) => `${value} (${formatCurrency(entry.payload.value)})`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}
                  {expenseView === "category" && (
                    <>
                      <ul className="dashboard-expanded-detail-list">
                        {categoryList.map(([name, amount]) => {
                          const pct = thisTotal > 0 ? ((amount / thisTotal) * 100).toFixed(1) : "0";
                          return (
                            <li key={name} className="dashboard-expanded-detail-row">
                              <span className="dashboard-expanded-detail-name">{name}</span>
                              <span className="dashboard-expanded-detail-amount">{formatCurrency(amount)}</span>
                              <span className="dashboard-expanded-detail-pct">{pct}%</span>
                            </li>
                          );
                        })}
                      </ul>
                      {categoryPieData.length > 0 && (
                        <div className="dashboard-expanded-chart-main">
                          <ResponsiveContainer width="100%" height={380}>
                            <PieChart>
                              <Pie data={categoryPieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={140} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                                {categoryPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v) => formatCurrency(v)} />
                              <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 16 }} formatter={(value, entry) => `${value} (${formatCurrency(entry.payload.value)})`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}
                  {expenseView === "member" && (
                    <>
                      <ul className="dashboard-expanded-detail-list">
                        {memberList.map(([name, amount]) => {
                          const pct = thisTotal > 0 ? ((amount / thisTotal) * 100).toFixed(1) : "0";
                          return (
                            <li key={name} className="dashboard-expanded-detail-row">
                              <span className="dashboard-expanded-detail-name">{name}</span>
                              <span className="dashboard-expanded-detail-amount">{formatCurrency(amount)}</span>
                              <span className="dashboard-expanded-detail-pct">{pct}%</span>
                            </li>
                          );
                        })}
                      </ul>
                      {memberPieData.length > 0 && (
                        <div className="dashboard-expanded-chart-main">
                          <ResponsiveContainer width="100%" height={380}>
                            <PieChart>
                              <Pie data={memberPieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={140} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                                {memberPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v) => formatCurrency(v)} />
                              <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 16 }} formatter={(value, entry) => `${value} (${formatCurrency(entry.payload.value)})`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {expandedCard === "recent" && (
              <div className="dashboard-expanded-section dashboard-expanded-charts-view">
                <h3>Senaste månaderna</h3>
                <p className="dashboard-expanded-total">
                  Summa 6 månader: {formatCurrency(recentMonths.reduce((s, m) => s + m.total, 0))}
                </p>
                <div className="dashboard-expanded-section-inner">
                  {barData.length > 0 && (
                    <div className="dashboard-expanded-chart-main dashboard-expanded-bar-wrap">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={barData} margin={{ top: 24, right: 24, left: 24, bottom: 24 }}>
                          <XAxis dataKey="month" tick={{ fontSize: 14 }} />
                          <YAxis tick={{ fontSize: 14 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} k`} />
                          <Tooltip formatter={(v) => [formatCurrency(v), "Totalt"]} contentStyle={{ fontSize: 14 }} />
                          <Bar dataKey="total" fill={CHART_COLORS[0]} name="Totalt" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <table className="dashboard-recent-table dashboard-expanded-table">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
