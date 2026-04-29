'use server'

import { client } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  typescript: true,
  apiVersion: '2024-04-10',
})

export const getUserClients = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    return client.customer.count({
      where: {
        Domain: {
          User: { id: session.user.id },
        },
      },
    })
  } catch (error) {
    console.log(error)
  }
}

export const getUserBalance = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const connectedStripe = await client.user.findUnique({
      where: { id: session.user.id },
      select: { stripeId: true },
    })

    if (connectedStripe?.stripeId) {
      const transactions = await stripe.balance.retrieve({
        stripeAccount: connectedStripe.stripeId,
      })

      if (transactions) {
        const sales = transactions.pending.reduce((total, next) => total + next.amount, 0)
        return sales / 100
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const getUserPlanInfo = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const plan = await client.user.findUnique({
      where: { id: session.user.id },
      select: {
        _count: { select: { domains: true } },
        subscription: { select: { plan: true, credits: true } },
      },
    })

    if (plan) {
      return {
        plan: plan.subscription?.plan,
        credits: plan.subscription?.credits,
        domains: plan._count.domains,
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const getUserTotalProductPrices = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const products = await client.product.findMany({
      where: {
        Domain: {
          User: { id: session.user.id },
        },
      },
      select: { price: true },
    })

    if (products) {
      return products.reduce((total, next) => total + next.price, 0)
    }
  } catch (error) {
    console.log(error)
  }
}

export const getUserTransactions = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) return

    const connectedStripe = await client.user.findUnique({
      where: { id: session.user.id },
      select: { stripeId: true },
    })

    if (connectedStripe?.stripeId) {
      return stripe.charges.list({
        stripeAccount: connectedStripe.stripeId,
      })
    }
  } catch (error) {
    console.log(error)
  }
}