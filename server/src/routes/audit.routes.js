import express from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /audit-log
// JUDGE only: returns immutable system event logs with optional filtering
router.get("/", requireAuth, requireRole("JUDGE"), async (req, res, next) => {
  try {
    const { action, limit = 50, page = 1 } = req.query;
    const take = Math.min(parseInt(limit, 10) || 50, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {};
    if (action && action !== "ALL") {
      where.action = action;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
          case: {
            select: { id: true, caseNumber: true, title: true, status: true },
          },
        },
      }),
    ]);

    const formattedLogs = logs.map((log) => {
      let parsedDetails = null;
      try {
        parsedDetails = JSON.parse(log.details);
      } catch {
        parsedDetails = log.details;
      }

      return {
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        user: log.user,
        case: log.case,
        details: parsedDetails,
      };
    });

    res.json({
      total,
      page: parseInt(page, 10) || 1,
      totalPages: Math.ceil(total / take),
      logs: formattedLogs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

