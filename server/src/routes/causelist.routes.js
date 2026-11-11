import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { generateCauseList, getCauseList } from "../services/causelist.service.js";

const router = express.Router();

const causeListQuerySchema = z.object({
  judgeId: z.string().uuid("Invalid judge identifier"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
});

// GET /cause-list?judgeId=...&date=...
// Retrieve hearings for a given judge and date
router.get("/", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const parseResult = causeListQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { judgeId, date } = parseResult.data;
    const result = await getCauseList({ judgeId, date });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /cause-list
// Generate cause list for a judge on a date (idempotent; creates hearings inside a transaction)
router.post("/", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const parseResult = causeListQuerySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { judgeId, date } = parseResult.data;
    const result = await generateCauseList({
      judgeId,
      date,
      userId: req.user.id,
    });

    return res.status(result.alreadyGenerated ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

