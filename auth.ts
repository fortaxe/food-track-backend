
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";
import { openAPI } from "better-auth/plugins";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 365, // 1 year
        updateAge: 60 * 60 * 24 * 365, // 1 year
    },
    trustedOrigins: [
        "http://localhost:3000",
        "https://food-track-web.vercel.app",
    ],
    advanced: {
        crossSubDomainCookies: {
            enabled: false,
        },
    },
    plugins: [
        openAPI()
    ]
});

