import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";

export const budgetRouter = Router();

budgetRouter.get(
  "/",
  [
    query("year").optional().isInt({ min: 2000, max: 2100 }).toInt(),
    query("month").optional().isInt({ min: 1, max: 12 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { year, month } = req.query;
      const where = { userId: req.user.id };
      if (year) where.year = Number(year);
      if (month) where.month = Number(month);

      const budget = await prisma.monthlyBudget.findFirst({ where });
      res.json({
        budget: budget ? { id: budget.id, month: budget.month, year: budget.year, amount: Number(budget.amount) } : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

budgetRouter.put(
  "/",
  [
    body("month").isInt({ min: 1, max: 12 }).toInt(),
    body("year").isInt({ min: 2000, max: 2100 }).toInt(),
    body("amount").isFloat({ min: 0 }).withMessage("Belopp måste vara >= 0"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { month, year, amount } = req.body;
      const budget = await prisma.monthlyBudget.upsert({
        where: {
          userId_month_year: {
            userId: req.user.id,
            month: Number(month),
            year: Number(year),
          },
        },
        create: {
          userId: req.user.id,
          month: Number(month),
          year: Number(year),
          amount: Number(amount),
        },
        update: { amount: Number(amount) },
      });
      res.json({ budget: { id: budget.id, month: budget.month, year: budget.year, amount: Number(budget.amount) } });
    } catch (err) {
      next(err);
    }
  }
);
