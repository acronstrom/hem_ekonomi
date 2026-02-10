import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";

export const categoryRulesRouter = Router();

function normalizeLineName(s) {
  return (s != null ? String(s).trim() : "").toLowerCase();
}

categoryRulesRouter.get("/", async (req, res, next) => {
  try {
    const rules = await prisma.categoryRule.findMany({
      where: { userId: req.user.id },
      orderBy: [{ lineNameNormalized: "asc" }, { amount: "asc" }],
    });
    const serialized = rules.map((r) => ({
      id: r.id,
      lineName: r.lineName,
      lineNameNormalized: r.lineNameNormalized,
      amount: Number(r.amount),
      categoryName: r.categoryName,
    }));
    res.json({ rules: serialized });
  } catch (err) {
    next(err);
  }
});

categoryRulesRouter.post(
  "/",
  [
    body("lineName").trim().notEmpty().withMessage("Benämning krävs"),
    body("amount").isFloat({ min: 0 }).withMessage("Belopp måste vara >= 0"),
    body("category").trim().notEmpty().withMessage("Kategori krävs"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const lineName = String(req.body.lineName).trim();
      const lineNameNormalized = normalizeLineName(lineName);
      const amount = Number(req.body.amount);
      const categoryName = String(req.body.category).trim();

      const rule = await prisma.categoryRule.upsert({
        where: {
          userId_lineNameNormalized_amount: {
            userId: req.user.id,
            lineNameNormalized,
            amount,
          },
        },
        create: {
          userId: req.user.id,
          lineName,
          lineNameNormalized,
          amount,
          categoryName,
        },
        update: { lineName, categoryName },
      });

      res.status(201).json({
        rule: {
          id: rule.id,
          lineName: rule.lineName,
          lineNameNormalized: rule.lineNameNormalized,
          amount: Number(rule.amount),
          categoryName: rule.categoryName,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
