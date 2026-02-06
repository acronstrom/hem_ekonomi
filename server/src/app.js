import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { expensesRouter } from "./routes/expenses.js";
import { lineItemsRouter } from "./routes/lineItems.js";
import { categoriesRouter } from "./routes/categories.js";
import { incomeRouter } from "./routes/income.js";
import { budgetRouter } from "./routes/budget.js";
import { cardSectionsRouter } from "./routes/cardSections.js";
import { authMiddleware } from "./middleware/auth.js";

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOrigins = CLIENT_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true);
  const allowList = [...corsOrigins];
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return cb(null, true);
  }
  // Production with no CLIENT_ORIGIN set (e.g. same-origin on Vercel): allow request origin
  if (allowList.length === 0 && process.env.NODE_ENV === "production") return cb(null, true);
  if (allowList.includes(origin)) return cb(null, true);
  return cb(null, allowList[0] || false);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/expenses", authMiddleware, expensesRouter);
app.use("/api/line-items", authMiddleware, lineItemsRouter);
app.use("/api/categories", authMiddleware, categoriesRouter);
app.use("/api/income", authMiddleware, incomeRouter);
app.use("/api/budget", authMiddleware, budgetRouter);
app.use("/api/card-sections", authMiddleware, cardSectionsRouter);

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({
    error: err.message ?? "Internal server error",
  });
});

export default app;
