import { Router } from "express";
import type { Request, Response } from "express";
import { ElevenLabsClient } from "elevenlabs";
import { db } from "../db";
import { foodLog } from "../db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

// Get signed URL for ElevenLabs Conversational AI
router.post("/elevenlabs/signed-url", async (req: Request, res: Response) => {
    try {
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        if (!agentId) {
            return res.status(500).json({ error: "ElevenLabs Agent ID not configured" });
        }

        const client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });

        // Get signed URL for conversation
        const response = await client.conversationalAi.getSignedUrl({
            agent_id: agentId,
        });

        res.json({ signedUrl: response.signed_url });
    } catch (error) {
        console.error("Error getting signed URL:", error);
        res.status(500).json({ error: "Failed to get signed URL" });
    }
});

// Webhook handler for ElevenLabs Agent function calls
router.post("/elevenlabs/webhook", async (req: Request, res: Response) => {
    try {
        console.log("ElevenLabs webhook received:", JSON.stringify(req.body, null, 2));

        const { function_name, parameters, user_id } = req.body;

        // Use a default user ID if not provided (you can pass this via conversation metadata)
        const userId = user_id || "default_user";

        if (function_name === "log_food") {
            const { meal_type, food_items } = parameters;

            const newLog = await db.insert(foodLog).values({
                id: nanoid(),
                userId,
                mealType: meal_type,
                foodItems: JSON.stringify([food_items]),
                notes: null,
                loggedAt: new Date(),
                createdAt: new Date(),
            }).returning();

            console.log("Food logged via Agent:", newLog[0]);

            return res.json({
                success: true,
                result: `Successfully logged ${meal_type}: ${food_items}`
            });
        }

        if (function_name === "get_food_history") {
            const { days = 7 } = parameters;

            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - days);

            const logs = await db
                .select()
                .from(foodLog)
                .where(gte(foodLog.loggedAt, daysAgo))
                .orderBy(desc(foodLog.loggedAt));

            // Format for AI to understand
            const formattedLogs = logs.map(log => ({
                date: log.loggedAt?.toISOString().split('T')[0],
                time: log.loggedAt?.toISOString().split('T')[1]?.substring(0, 5),
                meal: log.mealType,
                food: log.foodItems
            }));

            console.log("Food history retrieved:", formattedLogs.length, "entries");

            return res.json({
                success: true,
                result: JSON.stringify(formattedLogs)
            });
        }

        // Unknown function
        res.status(400).json({ error: "Unknown function" });
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});

// Text-to-speech endpoint
router.post("/elevenlabs/tts", async (req: Request, res: Response) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });

        const audioStream = await client.textToSpeech.convert(
            process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
            {
                text,
                model_id: "eleven_turbo_v2_5",
            }
        );

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Transfer-Encoding", "chunked");

        for await (const chunk of audioStream) {
            res.write(chunk);
        }
        res.end();
    } catch (error) {
        console.error("Error generating TTS:", error);
        res.status(500).json({ error: "Failed to generate speech" });
    }
});

export default router;

