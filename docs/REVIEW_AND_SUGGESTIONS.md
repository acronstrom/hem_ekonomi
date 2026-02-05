# Hem Ekonomi – Review & suggestions

## What you have today

| Area | Current state |
|------|----------------|
| **Auth** | Register, login, JWT, secure cookies |
| **Data** | Monthly line items: section, line name, category, amount. User-defined categories and section names. |
| **Views** | Dashboard (totals, comparison, loans, by section, last 6 months) + Månadsöversikt (Excel-like sheet per month). |
| **Workflow** | Copy from another month, rename sections, add empty sections, edit/delete rows. |
| **Loans** | Detected by section name (lån/bolån/bil/etc.) and shown as a total on the dashboard. No balance or interest. |

---

## Suggestions for tracking home economy

### 1. **Income (inkomster)** – High impact

- **Why:** You only track expenses today. A household budget is income minus expenses; without income you can’t see “leftover” or savings.
- **Idea:** Add *income* per month (e.g. “Lön”, “Bidrag”, “Övrigt”) with amount. One or several rows per month.
- **Dashboard:** Show “Total inkomst”, “Total utgift”, “Sparande / överskott” (income − expenses) for the month.
- **Implementation:** New model `MonthlyIncome` (userId, month, year, source, amount) or reuse line items with a section “Inkomster” and treat it as income in the dashboard.

### 2. **Budget / savings goal (budgetmål)**

- **Why:** Helps answer “how much can we spend?” or “are we saving enough?”.
- **Idea:** Optional monthly *budget* (total amount you plan to spend) or *savings goal* (amount you want to save). Dashboard shows “Under/över budget” or “Sparmål nått”.
- **Implementation:** Simple: one field per month (budget or savings goal). Or a user setting “Sparmål per månad” and compare to (income − expenses).

### 3. **Loan tracking (lån)**

- **Why:** Today you only sum “loan-like” sections. For planning you often want remaining balance, interest, and payoff date.
- **Idea:** Optional *loan definition* per user: name, type (bolån, billån, CSN, etc.), start balance, interest rate, monthly payment, optional end date. Then each month you can log “payment made” and optionally “remaining balance” (or compute it).
- **Dashboard:** “Lån” card could show: total monthly payment (as now) + list of loans with remaining balance and “payoff in X years” if you store balance/rate.
- **Implementation:** New table e.g. `Loan` (userId, name, type, initialBalance, currentBalance, interestRate, monthlyPayment) and optionally `LoanPayment` (loanId, month, year, amount, balanceAfter). Start simple: only store “remaining balance” per month per loan if you don’t want full amortisation logic.

### 4. **Year view & annual summary**

- **Why:** Taxes and planning are often yearly; monthly-only is limiting.
- **Idea:** “Årsöversikt”: choose year, see total income, total expenses, total per section for the year. Optional: average per month.
- **Implementation:** Reuse existing line items; aggregate by year in API (e.g. `GET /api/line-items?year=2025` without month) and show totals in a simple table or chart.

### 5. **Charts (enkel visualisering)**

- **Why:** Easier to see “where the money goes” and trends.
- **Idea:** On dashboard or a separate “Statistik”-tab: pie chart (utgifter per sektion denna månad), bar chart (jämförelse senaste 6 månaderna), or line (trend över tid).
- **Implementation:** Add a small chart library (e.g. Chart.js, Recharts) and one or two components that read the same data you already fetch.

### 6. **Export (export)**

- **Why:** Many want to use data in Excel, for accountant, or for taxes.
- **Idea:** “Exportera” knapp: ladda ner aktuell månad eller valt år som CSV (sections, rows, amounts). Optional: Excel-friendly format.
- **Implementation:** Backend endpoint that returns CSV, or frontend builds CSV from existing API data and triggers download.

### 7. **Due dates / påminnelser (valfritt)**

- **Why:** Bills have due dates; planning “when is what due?” helps cash flow.
- **Idea:** Optional “Förfallodatum” (day of month, e.g. 25) per section or per row. Dashboard could show “Kommer denna vecka” (bills due in the next 7 days).
- **Implementation:** Add `dueDay` (1–31) to section or to line item; filter/display on dashboard.

### 8. **Recurring vs one-off (återkommande vs engångs)**

- **Why:** “Fasta” vs “engångsutgifter” is a common split; templates are already there (copy from last month), but marking “recurring” can help.
- **Idea:** Optional flag per line (or per section): “Återkommande” vs “Engång”. Dashboard could show “Fasta utgifter” vs “Engångsutgifter” for the month.
- **Implementation:** Add `isRecurring` (boolean) to `MonthlyLineItem`; when copying month, only copy recurring rows by default (with option “copy all”).

### 9. **Notes / receipts (anteckningar)**

- **Why:** “Vad var denna utgift?” – useful for taxes and disputes.
- **Idea:** Optional “Anteckning” or “Kvitto” (text or link) per line item. Already have optional category; a free-text note field is a small extension.
- **Implementation:** Add `notes` (String?) to `MonthlyLineItem` and show in sheet + in any export.

### 10. **Household / shared (hushåll)**

- **Why:** Home economy is often shared (partner, family). Today it’s one user per account.
- **Idea:** “Hushåll”: invite another user (email) and share the same line items (read/write). Or keep single-user but add “Dela som skrivskyddad länk” for one month.
- **Implementation:** Bigger change (household model, roles, shared data). Start with “export + share file” or a simple “view-only” link with token if you want something small.

### 11. **Budget alerts (valfritt)**

- **Why:** “We’re over budget” or “Loan payment due soon”.
- **Idea:** If you add budget (see above), show a warning when total expenses > budget. Optional: simple in-app or email reminder (e.g. “Du har nått 90 % av budgeten”).
- **Implementation:** Frontend-only first: compare total to budget and show a banner. Email later with a cron job or background job.

### 12. **Cleanup / small UX**

- **Remove or hide “Enkel utgiftslista”** – Already removed in your app.
- **MonthlyExpense table** – You still have it in the schema but no UI. Either remove it and migrate any old data to line items, or document it as “legacy” and keep for backward compatibility.
- **Dashboard “Visa månad”** – Consider “Denna månad” as default label when viewing current month.
- **Empty state** – When a month has no data, a short tip: “Kopiera från förra månaden för att komma igång” directly on the sheet.

---

## Suggested priority

| Priority | Feature | Effort | Impact |
|----------|--------|--------|--------|
| 1 | **Income + “Sparande” on dashboard** | Low | High – completes the basic picture |
| 2 | **Year view / annual summary** | Low | Medium – better for planning and taxes |
| 3 | **Export (CSV)** | Low | Medium – very requested for home economy |
| 4 | **Charts (pie + trend)** | Medium | Medium – clarity and motivation |
| 5 | **Budget goal (one number per month)** | Low | Medium – “are we on track?” |
| 6 | **Loan balance / simple loan tracking** | Medium | High for loan-heavy households |
| 7 | **Notes per line item** | Low | Low–medium – quality of life |
| 8 | **Recurring vs one-off** | Low | Medium – better copy-from-month and reporting |
| 9 | **Due dates** | Medium | Medium – cash flow planning |
| 10 | **Household sharing** | High | High if used by more than one person |

---

## Summary

You already have a solid base: auth, flexible sections and categories, monthly sheet, copy-between-months, and a dashboard with totals and loan sum. The biggest gap for “home economy” is **income** and **savings view**; after that, **year view**, **export**, and **simple charts** add a lot of value. Loan balance tracking and budget goals are natural next steps if you want to go deeper. The rest (notes, recurring flag, due dates, household) can be added incrementally based on how you use the app.
