'use server'
import { client } from '@/lib/prisma'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'

export const onGetCurrentUser = async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  return client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullname: true,
      email: true,
      type: true,
      domains: {
        select: {
          name: true,
          icon: true,
          id: true,
        },
      },
    },
  })
}

export const onLoginUser = async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/auth/sign-in')
  }

  const user = await client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullname: true,
      type: true,
    },
  })

  if (!user) {
    redirect('/auth/sign-in')
  }

  const domains = await client.domain.findMany({
    where: { userId: user.id },
    select: {
      name: true,
      icon: true,
      id: true,
    },
  })

  return { status: 200, user, domain: domains }
}