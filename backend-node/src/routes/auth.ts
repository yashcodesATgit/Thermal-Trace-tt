import { Request, Response, Router } from 'express';
import { db } from '../db/postgres';
import { verifyPassword, createSession, getSession, revokeSession } from '../services/auth.service';

export const authRouter = Router();

authRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ error: "Missing email or password." });
    }

    const cleanEmail = email.trim().toLowerCase();

    const query = `SELECT id, name, email, password_hash FROM users WHERE email = $1`;
    const result = await db.query(query, [cleanEmail]);
    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    const token = createSession(user.id, user.email, user.name);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.get('/auth/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ detail: "Missing Authorization header." });
    }

    const sess = getSession(authHeader);
    if (!sess) {
      return res.status(401).json({ detail: "Invalid or expired session token." });
    }

    res.json({
      id: sess.user_id,
      name: sess.name,
      email: sess.email
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

authRouter.post('/auth/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      revokeSession(authHeader);
    }
    res.json({ message: "Successfully logged out." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
