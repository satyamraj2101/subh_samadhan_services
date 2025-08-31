import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;
    const user = await AuthService.register(email, password, fullName);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const token = await AuthService.login(email, password);
    res.json({ token });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}
