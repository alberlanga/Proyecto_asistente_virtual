import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const agentId = req.params.agentId as string;

    const calls = await prisma.call.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' }
    });

    const total = calls.length;
    const byType: Record<string, number> = {};
    for (const call of calls) {
      const t = call.call_type || 'otro';
      byType[t] = (byType[t] || 0) + 1;
    }

    const totalCost = calls.reduce((acc, c) => acc + (c.cost || 0), 0);

    res.json({ agentId, stats: { total, byType, totalCost }, calls });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
