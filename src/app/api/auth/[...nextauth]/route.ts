// Handle NextAuth build issues
let handlers: any = {
  GET: () => new Response('Auth not available during build', { status: 503 }),
  POST: () => new Response('Auth not available during build', { status: 503 }),
}

try {
  const { GET, POST } = require('@/lib/auth')
  handlers = { GET, POST }
} catch (error) {
  console.warn('NextAuth not available during build:', error)
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = handlers.GET
export const POST = handlers.POST