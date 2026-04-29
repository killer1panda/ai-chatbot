import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // NextAuth / Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(1),

  // Stripe
  STRIPE_SECRET: z.string().min(1),

  // AI
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  BRAND_NAME: z.string().default('Your App'),

  // Email
  NODE_MAILER_EMAIL: z.string().email().optional(),
  NODE_MAILER_GMAIL_APP_PASSWORD: z.string().optional(),

  // Pusher
  NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error(
    'Missing or invalid environment variables:',
    parsed.error.flatten().fieldErrors
  )
  throw new Error('Invalid environment variables')
}

export const env = parsed.data
