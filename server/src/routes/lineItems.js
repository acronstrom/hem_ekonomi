import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";

export const lineItemsRouter = Router();

lineItemsRouter.get(
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

      const items = await prisma.monthlyLineItem.findMany({
        where,
        orderBy: [{ section: "asc" }, { lineName: "asc" }],
      });

      const serialized = items.map((e) => ({
        ...e,
        amount: Number(e.amount),
        category: e.category ?? null,
      }));

      res.json({ items: serialized });
    } catch (err) {
      next(err);
    }
  }
);

lineItemsRouter.post(
  "/",
  [
    body("month").isInt({ min: 1, max: 12 }).toInt(),
    body("year").isInt({ min: 2000, max: 2100 }).toInt(),
    body("section").trim().notEmpty().withMessage("Sektion krävs"),
    body("lineName").trim().notEmpty().withMessage("Radnamn krävs"),
    body("amount").isFloat({ min: 0 }).withMessage("Belopp måste vara >= 0"),
    body("category").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { month, year, section, lineName, amount, category } = req.body;
      const item = await prisma.monthlyLineItem.create({
        data: {
          userId: req.user.id,
          month: Number(month),
          year: Number(year),
          section: String(section).trim(),
          lineName: String(lineName).trim(),
          amount: Number(amount),
          category: category ? String(category).trim() : null,
        },
      });

      res.status(201).json({
        item: { ...item, amount: Number(item.amount) },
      });
    } catch (err) {
      next(err);
    }
  }
);

lineItemsRouter.patch(
  "/:id",
  [
    body("section").optional().trim().notEmpty(),
    body("lineName").optional().trim().notEmpty(),
    body("amount").optional().isFloat({ min: 0 }),
    body("category").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const existing = await prisma.monthlyLineItem.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) {
        return res.status(404).json({ error: "Raden hittades inte" });
      }

      const updates = {};
      if (req.body.section !== undefined) updates.section = req.body.section;
      if (req.body.lineName !== undefined) updates.lineName = req.body.lineName;
      if (req.body.amount !== undefined) updates.amount = req.body.amount;
      if (req.body.category !== undefined) updates.category = req.body.category ? String(req.body.category).trim() : null;

      const item = await prisma.monthlyLineItem.update({
        where: { id: req.params.id },
        data: updates,
      });

      res.json({ item: { ...item, amount: Number(item.amount) } });
    } catch (err) {
      next(err);
    }
  }
);

lineItemsRouter.delete(
  "/",
  [
    query("month").isInt({ min: 1, max: 12 }).toInt(),
    query("year").isInt({ min: 2000, max: 2100 }).toInt(),
    query("section").trim().notEmpty().withMessage("Sektion krävs"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { month, year, section } = req.query;
      const result = await prisma.monthlyLineItem.deleteMany({
        where: {
          userId: req.user.id,
          month: Number(month),
          year: Number(year),
          section: String(section).trim(),
        },
      });
      res.json({ deleted: result.count });
    } catch (err) {
      next(err);
    }
  }
);

lineItemsRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.monthlyLineItem.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Raden hittades inte" });
    }
    await prisma.monthlyLineItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
