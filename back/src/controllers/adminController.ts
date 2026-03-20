import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true, email: true, role: true, maxAssistants: true, maxPhoneNumbers: true,
        agents: { select: { id: true, agentName: true, createdAt: true } },
        phoneNumbers: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, role: true, maxAssistants: true, maxPhoneNumbers: true, createdAt: true,
        agents: {
          select: {
            id: true, agentName: true, company: true, gender: true, createdAt: true,
            phoneNumber: { select: { number: true } },
            calls: { select: { id: true, status: true, cost: true, caller_phone: true, call_type: true, createdAt: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        phoneNumbers: {
          select: { id: true, number: true, createdAt: true, agents: { select: { id: true, agentName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role, maxAssistants } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'El email ya está registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'USER',
        maxAssistants: maxAssistants ? parseInt(maxAssistants, 10) : 1
      },
      select: { id: true, email: true, role: true, maxAssistants: true }
    });

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserLimit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { maxAssistants, maxPhoneNumbers } = req.body;
    const data: any = {};
    if (maxAssistants !== undefined) data.maxAssistants = parseInt(maxAssistants, 10);
    if (maxPhoneNumbers !== undefined) data.maxPhoneNumbers = parseInt(maxPhoneNumbers, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, maxAssistants: true, maxPhoneNumbers: true }
    });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
