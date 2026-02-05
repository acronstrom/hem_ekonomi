import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";

export const incomeRouter = Router();

incomeRouter.get(
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

      const items = await prisma.monthlyIncome.findMany({
        where,
        orderBy: [{ year: "desc" }, { month: "desc" }, { source: "asc" }],
      });
      const serialized = items.map((e) => ({ ...e, amount: Number(e.amount) }));
      res.json({ items: serialized });
    } catch (err) {
      next(err);
    }
  }
);

incomeRouter.post(
  "/",
  [
    body("month").isInt({ min: 1, max: 12 }).toInt(),
    body("year").isInt({ min: 2000, max: 2100 }).toInt(),
    body("source").trim().notEmpty().withMessage("Källa krävs"),
    body("amount").isFloat({ min: 0 }).withMessage("Belopp måste vara >= 0"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { month, year, source, amount } = req.body;
      const item = await prisma.monthlyIncome.create({
        data: {
          userId: req.user.id,
          month: Number(month),
          year: Number(year),
          source: String(source).trim(),
          amount: Number(amount),
        },
      });
      res.status(201).json({ item: { ...item, amount: Number(item.amount) } });
    } catch (err) {
      next(err);
    }
  }
);

incomeRouter.patch(
  "/:id",
  [
    body("source").optional().trim().notEmpty(),
    body("amount").optional().isFloat({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const existing = await prisma.monthlyIncome.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) return res.status(404).json({ error: "Hittades inte" });
      const updates = {};
      if (req.body.source !== undefined) updates.source = req.body.source;
      if (req.body.amount !== undefined) updates.amount = req.body.amount;
      const item = await prisma.monthlyIncome.update({
        where: { id: req.params.id },
        data: updates,
      });
      res.json({ item: { ...item, amount: Number(item.amount) } });
    } catch (err) {
      next(err);
    }
  }
);

incomeRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.monthlyIncome.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: "Hittades inte" });
    await prisma.monthlyIncome.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
