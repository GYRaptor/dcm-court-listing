import express from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("CLERK"), async (req, res, next) => {
  try {
    const judges = await prisma.judge.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        cases: {
          where: {
            status: { in: ["PENDING", "LISTED"] },
          },
          select: { id: true, complexity: true, status: true },
        },
      },
      orderBy: { courtroom: "asc" },
    });

    const formattedJudges = judges.map((j) => {
      const activeCases = j.cases.length;
      const totalWorkload = j.cases.reduce((sum, c) => sum + (c.complexity || 0), 0);

      return {
        id: j.id,
        courtroom: j.courtroom,
        dailyCapacity: j.dailyCapacity,
        name: j.user.name,
        email: j.user.email,
        activeCases,
        totalWorkload,
      };
    });

    return res.status(200).json({ judges: formattedJudges });
  } catch (err) {
    next(err);
  }
});

export default router;

