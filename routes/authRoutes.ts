
import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth";
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";


const router = Router();

// This matches POST /api/auth/continue
// This matches POST /api/auth/continue
router.post("/auth/continue", async (req, res, next) => {
    console.log("-> Continue route hit:", req.body);
    try {
        const { email, name } = req.body;

        // Check if user exists
        const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

        if (existingUser.length > 0) {
            // User exists -> Sign In
            // NOTE: When using router, we are mounted at /api, so the path inside router is /auth/continue
            // But toNodeHandler(auth) expects the full URL structure if strictly handled?
            // Actually, `toNodeHandler` handles the request. Better Auth internal routing might expect /api/auth/...
            // Let's stick to what worked in index.ts: /api/auth/sign-in/email
            req.url = "/api/auth/sign-in/email";
        } else {
            // User does not exist -> Sign Up
            req.url = "/api/auth/sign-up/email";
            // Ensure name is present for sign up
            if (!req.body.name) {
                req.body.name = "User"; // Default name
            }
        }

        // Hand off to Better Auth
        // @ts-ignore
        return toNodeHandler(auth)(req, res, next);
    } catch (error) {
        console.log("-> Continue route error:", error);
        next(error);
    }
});

console.log("Auth route hit");
router.all("/auth/*path", toNodeHandler(auth));


export default router;
