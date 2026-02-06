import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import MonthYearPicker from "../components/MonthYearPicker";
import MonthlySheet from "../components/MonthlySheet";
import Dashboard from "../components/Dashboard";
import CategoryManager from "../components/CategoryManager";
import CopyFromMonth from "../components/CopyFromMonth";
import ThemeToggle from "../components/ThemeToggle";
import { API_BASE } from "../api";

const API = `${API_BASE}/api`;

export default function Portal() {
  const { user, logout } = useAuth();
  const [lineItems, setLineItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCopyFromMonth, setShowCopyFromMonth] = useState(false);
  const [view, setView] = useState("dashboard");
  const [sectionDisplayNames, setSectionDisplayNames] = useState({});
  const [customSectionNames, setCustomSectionNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  async function loadCategories() {
    try {
      const res = await fetch(`${API}/categories`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories);
    } catch {
      setCategories([]);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadLineItems() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API}/line-items?month=${month}&year=${year}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Kunde inte hämta data");
      const data = await res.json();
      setLineItems(data.items);
    } catch (err) {
      setError(err.message);
      setLineItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLineItems();
  }, [month, year]);

  async function addLineItem(payload) {
    const res = await fetch(`${API}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.errors?.[0]?.msg ?? data.error ?? "Kunde inte spara";
      throw new Error(msg);
    }
    if (data.item) setLineItems((prev) => [...prev, data.item]);
  }

  async function copyFromMonth(sourceMonth, sourceYear) {
    const res = await fetch(
      `${API}/line-items?month=${sourceMonth}&year=${sourceYear}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error("Kunde inte hämta utgifter från vald månad");
    const data = await res.json();
    const sourceItems = data.items || [];
    if (sourceItems.length === 0) {
      throw new Error("Inga rader att kopiera i vald månad");
    }
    const created = [];
    for (const item of sourceItems) {
      const createRes = await fetch(`${API}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          month,
          year,
          section: item.section,
          lineName: item.lineName,
          amount: Number(item.amount),
          category: item.category || undefined,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        const msg = createData.errors?.[0]?.msg ?? createData.error ?? "Kunde inte kopiera rad";
        throw new Error(msg);
      }
      if (createData.item) created.push(createData.item);
    }
    setLineItems((prev) => [...prev, ...created]);
  }

  async function updateLineItem(id, payload) {
    const res = await fetch(`${API}/line-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Kunde inte uppdatera");
    setLineItems((prev) =>
      prev.map((e) => (e.id === id ? data.item : e))
    );
  }

  async function deleteLineItem(id) {
    const res = await fetch(`${API}/line-items/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Kunde inte ta bort");
    setLineItems((prev) => prev.filter((e) => e.id !== id));
  }

  async function renameSection(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const toUpdate = lineItems.filter((i) => i.section === oldName);
    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        await updateLineItem(item.id, { section: trimmed });
      }
      setLineItems((prev) =>
        prev.map((i) => (i.section === oldName ? { ...i, section: trimmed } : i))
      );
    } else {
      setSectionDisplayNames((prev) => ({ ...prev, [oldName]: trimmed }));
    }
  }

  async function addCategory(name) {
    const res = await fetch(`${API}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Kunde inte lägga till");
    setCategories((prev) => [...prev, data.category]);
  }

  async function renameCategory(id, name) {
    const res = await fetch(`${API}/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Kunde inte uppdatera");
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
  }

  async function deleteCategory(id) {
    const res = await fetch(`${API}/categories/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Kunde inte ta bort");
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="portal">
      <header className="portal-header">
        <div>
          <h1>Hem Ekonomi</h1>
          <p className="portal-user">
            {user?.name || user?.email}
          </p>
        </div>
        <div className="portal-header-actions">
          <ThemeToggle />
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Logga ut
          </button>
        </div>
      </header>

      <main className="portal-main">
        <nav className="portal-nav">
          <button
            type="button"
            className={`portal-nav-item ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            Översikt
          </button>
          <button
            type="button"
            className={`portal-nav-item ${view === "sheet" ? "active" : ""}`}
            onClick={() => setView("sheet")}
          >
            Månadsöversikt
          </button>
          <div className="portal-nav-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCategoryManager(true)}>
              Kategorier
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCopyFromMonth(true)}>
              Kopiera från annan månad
            </button>
          </div>
        </nav>

        {view === "dashboard" && (
          <Dashboard
            apiBase={API_BASE}
            currentMonth={month}
            currentYear={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
            onOpenMonth={() => setView("sheet")}
          />
        )}

        {view === "sheet" && (
          <div className="portal-sheet-wrap">
            <div className="portal-toolbar">
              <div className="portal-section-header">
                <h2>Månadsöversikt</h2>
                <MonthYearPicker
                  month={month}
                  year={year}
                  onMonthChange={setMonth}
                  onYearChange={setYear}
                />
              </div>
            </div>

        {showCopyFromMonth && (
          <CopyFromMonth
            currentMonth={month}
            currentYear={year}
            onClose={() => setShowCopyFromMonth(false)}
            onCopy={copyFromMonth}
          />
        )}

        {showCategoryManager && (
          <CategoryManager
            categories={categories}
            onClose={() => setShowCategoryManager(false)}
            onAdd={addCategory}
            onRename={renameCategory}
            onDelete={deleteCategory}
          />
        )}

        <MonthlySheet
            items={lineItems}
            month={month}
            year={year}
            categories={categories}
            sectionDisplayNames={sectionDisplayNames}
            customSectionNames={customSectionNames}
            onAddCustomSection={(name) => setCustomSectionNames((prev) => (prev.includes(name) ? prev : [...prev, name].sort()))}
            loading={loading}
            error={error}
            onAdd={addLineItem}
            onUpdate={updateLineItem}
            onDelete={deleteLineItem}
            onRenameSection={renameSection}
          />
          </div>
        )}
      </main>
    </div>
  );
}
