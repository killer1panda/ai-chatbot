'use server'
import { client } from '@/lib/prisma'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const onIntegrateDomain = async (domain: string, icon: string) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { status: 401, message: 'Not authenticated' }

  try {
    const userData = await client.user.findUnique({
      where: { id: session.user.id },
      select: {
        _count: { select: { domains: true } },
        subscription: { select: { plan: true } },
      },
    })

    if (!userData) {
      return { status: 400, message: 'User not found' }
    }

    const domainExists = await client.domain.findFirst({
      where: {
        userId: session.user.id,
        name: domain,
      },
    })

    if (domainExists) {
      return { status: 400, message: 'Domain already exists' }
    }

    const plan = userData.subscription?.plan || 'STANDARD'
    const domainCount = userData._count.domains
    const planLimits: Record<string, number> = {
      'STANDARD': 1,
      'PRO': 5,
      'ULTIMATE': 10,
    }
    const limit = planLimits[plan] || 1

    if (domainCount >= limit) {
      return {
        status: 400,
        message: `You've reached the maximum (${limit}) for your ${plan} plan.`,
      }
    }

    await client.domain.create({
      data: {
        name: domain,
        icon,
        userId: session.user.id,
        chatBot: {
          create: {
            welcomeMessage: 'Hey there, have a question? Text us here',
          },
        },
      },
    })

    return { status: 200, message: 'Domain successfully added' }
  } catch (error) {
    console.error('onIntegrateDomain error:', error)
    return { status: 500, message: 'An error occurred' }
  }
}

export const onGetSubscriptionPlan = async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return

  const plan = await client.user.findUnique({
    where: { id: session.user.id },
    select: { subscription: { select: { plan: true } } },
  })

  return plan?.subscription?.plan || 'STANDARD'
}

export const onGetAllAccountDomains = async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return

  return client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      domains: {
        select: {
          name: true,
          icon: true,
          id: true,
          customer: {
            select: {
              chatRoom: {
                select: { id: true, live: true },
              },
            },
          },
        },
      },
    },
  })
}

export const onUpdatePassword = async (password: string) => {
  // Not supported with Google OAuth - would need custom credentials provider
  return { status: 400, message: 'Password update not available with Google sign-in' }
}

export const onGetCurrentDomainInfo = async (domain: string) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return

  return client.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscription: { select: { plan: true } },
      domains: {
        where: { name: { contains: domain } },
        select: {
          id: true,
          name: true,
          icon: true,
          userId: true,
          products: true,
          chatBot: {
            select: { id: true, welcomeMessage: true, icon: true },
          },
        },
      },
    },
  })
}

export const onUpdateDomain = async (id: string, name: string) => {
  try {
    const domainExists = await client.domain.findFirst({
      where: { name: { contains: name } },
    })

    if (domainExists) {
      return { status: 400, message: 'Domain with this name already exists' }
    }

    const domain = await client.domain.update({
      where: { id },
      data: { name },
    })

    if (domain) {
      return { status: 200, message: 'Domain updated' }
    }
    return { status: 400, message: 'Oops something went wrong!' }
  } catch (error) {
    console.log(error)
  }
}

export const onChatBotImageUpdate = async (id: string, icon: string) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return

  try {
    const domain = await client.domain.update({
      where: { id },
      data: {
        chatBot: {
          update: {
            data: { icon },
          },
        },
      },
    })

    if (domain) {
      return { status: 200, message: 'Domain updated' }
    }
    return { status: 400, message: 'Oops something went wrong!' }
  } catch (error) {
    console.log(error)
  }
}

export const onUpdateWelcomeMessage = async (message: string, domainId: string) => {
  try {
    const update = await client.domain.update({
      where: { id: domainId },
      data: {
        chatBot: {
          update: {
            data: { welcomeMessage: message },
          },
        },
      },
    })

    if (update) {
      return { status: 200, message: 'Welcome message updated' }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onDeleteUserDomain = async (id: string) => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return

  try {
    const deletedDomain = await client.domain.delete({
      where: {
        userId: session.user.id,
        id,
      },
      select: { name: true },
    })

    if (deletedDomain) {
      return {
        status: 200,
        message: `${deletedDomain.name} was deleted successfully`,
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const onCreateHelpDeskQuestion = async (id: string, question: string, answer: string) => {
  try {
    const helpDeskQuestion = await client.domain.update({
      where: { id },
      data: {
        helpdesk: {
          create: { question, answer },
        },
      },
      include: {
        helpdesk: {
          select: { id: true, question: true, answer: true },
        },
      },
    })

    if (helpDeskQuestion) {
      return {
        status: 200,
        message: 'New help desk question added',
        questions: helpDeskQuestion.helpdesk,
      }
    }
    return { status: 400, message: 'Oops! something went wrong' }
  } catch (error) {
    console.log(error)
  }
}

export const onGetAllHelpDeskQuestions = async (id: string) => {
  try {
    const questions = await client.helpDesk.findMany({
      where: { domainId: id },
      select: { question: true, answer: true, id: true },
    })

    return {
      status: 200,
      message: 'Questions fetched',
      questions,
    }
  } catch (error) {
    console.log(error)
  }
}

export const onCreateFilterQuestions = async (id: string, question: string) => {
  try {
    const filterQuestion = await client.domain.update({
      where: { id },
      data: {
        filterQuestions: {
          create: { question },
        },
      },
      include: {
        filterQuestions: {
          select: { id: true, question: true },
        },
      },
    })

    if (filterQuestion) {
      return {
        status: 200,
        message: 'Filter question added',
        questions: filterQuestion.filterQuestions,
      }
    }
    return { status: 400, message: 'Oops! something went wrong' }
  } catch (error) {
    console.log(error)
  }
}

export const onGetAllFilterQuestions = async (id: string) => {
  try {
    const questions = await client.filterQuestions.findMany({
      where: { domainId: id },
      select: { question: true, id: true },
      orderBy: { question: 'asc' },
    })

    return { status: 200, message: '', questions }
  } catch (error) {
    console.log(error)
  }
}

export const onGetPaymentConnected = async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return

  const connected = await client.user.findUnique({
    where: { id: session.user.id },
    select: { stripeId: true },
  })

  return connected?.stripeId
}

export const onCreateNewDomainProduct = async (id: string, name: string, image: string, price: string) => {
  try {
    const product = await client.domain.update({
      where: { id },
      data: {
        products: {
          create: {
            name,
            image,
            price: parseInt(price),
          },
        },
      },
    })

    if (product) {
      return { status: 200, message: 'Product successfully created' }
    }
  } catch (error) {
    console.log(error)
  }
}