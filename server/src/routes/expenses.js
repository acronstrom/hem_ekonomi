import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";

export const expensesRouter = Router();

expensesRouter.get(
  "/",
  [
    query("year").optional().isInt({ min: 2000, max: 2100 }).toInt(),
    query("month").optional().isInt({ min: 1, max: 12 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { year, month } = req.query;
      const where = { userId: req.user.id };
      if (year) where.year = Number(year);
      if (month) where.month = Number(month);

      const expenses = await prisma.monthlyExpense.findMany({
        where,
        orderBy: [{ year: "desc" }, { month: "desc" }, { category: "asc" }],
      });

      const serialized = expenses.map((e) => ({
        ...e,
        amount: Number(e.amount),
      }));

      res.json({ expenses: serialized });
    } catch (err) {
      next(err);
    }
  }
);

expensesRouter.post(
  "/",
  [
    body("month").isInt({ min: 1, max: 12 }).toInt(),
    body("year").isInt({ min: 2000, max: 2100 }).toInt(),
    body("category").trim().notEmpty().withMessage("Category required"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be >= 0"),
    body("description").optional().trim().escape(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { month, year, category, amount, description } = req.body;
      const expense = await prisma.monthlyExpense.create({
        data: {
          userId: req.user.id,
          month: Number(month),
          year: Number(year),
          category: String(category).trim(),
          amount,
          description: description || null,
        },
      });

      res.status(201).json({
        expense: { ...expense, amount: Number(expense.amount) },
      });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({
          error: "An expense for this month, year and category already exists",
        });
      }
      next(err);
    }
  }
);

expensesRouter.patch(
  "/:id",
  [
    body("category").optional().trim().notEmpty(),
    body("amount").optional().isFloat({ min: 0 }),
    body("description").optional().trim().escape(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const existing = await prisma.monthlyExpense.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) {
        return res.status(404).json({ error: "Expense not found" });
      }

      const updates = {};
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.amount !== undefined) updates.amount = req.body.amount;
      if (req.body.description !== undefined) updates.description = req.body.description;

      const expense = await prisma.monthlyExpense.update({
        where: { id: req.params.id },
        data: updates,
      });

      res.json({ expense: { ...expense, amount: Number(expense.amount) } });
    } catch (err) {
      next(err);
    }
  }
);

expensesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.monthlyExpense.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Expense not found" });
    }
    await prisma.monthlyExpense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
