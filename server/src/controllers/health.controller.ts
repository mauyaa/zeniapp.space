import { Request, Response } from 'express';
import { emailStatus } from '../services/email.service';

export function emailHealth(_req: Request, res: Response) {
  res.json(emailStatus());
}
