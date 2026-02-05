import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (req, res, next) => {
  try {
    const categories = await prisma.userCategory.findMany({
      where: { userId: req.user.id },
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.post(
  "/",
  [body("name").trim().notEmpty().withMessage("Namn krävs")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const name = String(req.body.name).trim();
      const existing = await prisma.userCategory.findUnique({
        where: {
          userId_name: { userId: req.user.id, name },
        },
      });
      if (existing) {
        return res.status(409).json({ error: "Kategorin finns redan" });
      }
      const category = await prisma.userCategory.create({
        data: { userId: req.user.id, name },
      });
      res.status(201).json({ category });
    } catch (err) {
      next(err);
    }
  }
);

categoriesRouter.patch(
  "/:id",
  [body("name").trim().notEmpty().withMessage("Namn krävs")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const existing = await prisma.userCategory.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!existing) {
        return res.status(404).json({ error: "Kategorin hittades inte" });
      }
      const name = String(req.body.name).trim();
      const category = await prisma.userCategory.update({
        where: { id: req.params.id },
        data: { name },
      });
      res.json({ category });
    } catch (err) {
      next(err);
    }
  }
);

categoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.userCategory.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Kategorin hittades inte" });
    }
    await prisma.userCategory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
