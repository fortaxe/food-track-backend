
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import { openAPI } from "better-auth/plugins";


export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    // socialProviders: {
    //     google: {
    //         clientId: process.env.GOOGLE_CLIENT_ID as string,
    //         clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    //     },
    // },
    session: {
        expiresIn: 60 * 60 * 24 * 365, // 1 year
        updateAge: 60 * 60 * 24 * 365, // 1 year
    },
    trustedOrigins: ["http://localhost:3000"],
    plugins: [
        openAPI()
    ]
});
