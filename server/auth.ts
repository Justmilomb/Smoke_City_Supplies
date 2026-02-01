import type { Request, Response, NextFunction } from "express";
import passport from "passport";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
    }
  }
}
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) return done(null, false, { message: "Invalid username or password" });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return done(null, false, { message: "Invalid username or password" });
      return done(null, { id: user.id, username: user.username });
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.()) return next();
  return res.status(401).json({ message: "Authentication required" });
}
