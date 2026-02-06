import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";

export const cardSectionsRouter = Router();

cardSectionsRouter.get("/", async (req, res, next) => {
  try {
    const list = await prisma.userCardSection.findMany({
      where: { userId: req.user.id },
      select: { sectionName: true },
      orderBy: { sectionName: "asc" },
    });
    res.json({ sectionNames: list.map((r) => r.sectionName) });
  } catch (err) {
    next(err);
  }
});

cardSectionsRouter.post(
  "/",
  [body("sectionName").trim().notEmpty().withMessage("Sektionsnamn krävs")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const sectionName = String(req.body.sectionName).trim();
      await prisma.userCardSection.upsert({
        where: {
          userId_sectionName: { userId: req.user.id, sectionName },
        },
        create: { userId: req.user.id, sectionName },
        update: {},
      });
      res.status(201).json({ sectionName });
    } catch (err) {
      next(err);
    }
  }
);

cardSectionsRouter.delete(
  "/",
  [body("sectionName").trim().notEmpty().withMessage("Sektionsnamn krävs")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const sectionName = String(req.body.sectionName).trim();
      await prisma.userCardSection.deleteMany({
        where: { userId: req.user.id, sectionName },
      });
      res.status(204).send();
    } catch (err) {
      if (err.code === "P2025") return res.status(204).send();
      next(err);
    }
  }
);
