import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-recepcion-key';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { agents: { select: { id: true, agentName: true, phoneNumberId: true } } }
    });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        maxAssistants: user.maxAssistants,
        agents: user.agents
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, email: true, role: true, maxAssistants: true,
        agents: { select: { id: true, agentName: true, phoneNumberId: true } }
      }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true });
};
