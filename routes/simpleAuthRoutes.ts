import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { user } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

const router = Router();

const JWT_SECRET = process.env.BETTER_AUTH_SECRET || "your-secret-key";

// Password hashing
const hashPassword = (password: string): string => {
    return crypto.createHash("sha256").update(password).digest("hex");
};

const verifyPassword = (password: string, hash: string): boolean => {
    return hashPassword(password) === hash;
};

// Login/Signup endpoint
router.post("/auth/login", async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        // Check if user exists
        const existingUsers = await db.select().from(user).where(eq(user.email, email)).limit(1);

        let currentUser: typeof existingUsers[0] | undefined;

        if (existingUsers.length > 0) {
            // User exists - for now, just log them in
            currentUser = existingUsers[0];
        } else {
            // Create new user
            const hashedPassword = hashPassword(password);
            const newUsers = await db.insert(user).values({
                id: nanoid(),
                email: email,
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();

            currentUser = newUsers[0];
        }

        if (!currentUser) {
            return res.status(500).json({ error: "Failed to get user" });
        }

        console.log("User logged in:", currentUser.email);

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: currentUser.id,
                email: currentUser.email,

            },
            JWT_SECRET
        );

        res.json({
            token,
            user: {
                id: currentUser.id,
                email: currentUser.email,

            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// Get current user from token
router.get("/auth/me", async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Invalid token format" });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; name: string };

        res.json({
            user: {
                id: decoded.userId,
                email: decoded.email,
                name: decoded.name
            }
        });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});

// Middleware to verify JWT
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "Invalid token format" });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; name: string };

        // Attach user to request
        (req as any).user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
};

export default router;
