'use server'

import { client } from '@/lib/prisma'
import { extractEmailsFromString, extractURLfromString } from '@/lib/utils'
import { onRealTimeChat } from '../conversation'
import { onMailer } from '../mailer'

// --- Types ---
type ChatTurn = { role: 'assistant' | 'user'; content: string }

type GeminiApiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
}

// --- Constants ---
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'
const GEMINI_API_KEY_FALLBACK =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const MAX_CHAT_HISTORY = 20

// --- Helper: Generate AI Reply via Gemini ---
const onGenerateGeminiReply = async (
  prompt: string,
  chat: ChatTurn[],
  message: string
) => {
  const apiKey = GEMINI_API_KEY_FALLBACK

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const recentChat = chat.slice(-MAX_CHAT_HISTORY)

  const conversationText = recentChat
    .filter((item) => item.content?.trim())
    .map(
      (item) =>
        `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${item.content}`
    )
    .join('\n')

  const geminiInput = [
    prompt.trim(),
    conversationText ? `Conversation so far:\n${conversationText}` : '',
    `User: ${message}`,
    'Assistant:',
  ]
    .filter(Boolean)
    .join('\n\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: geminiInput }],
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as GeminiApiResponse
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('\n')
    .trim()

  return text || "I'm having trouble responding right now. Please try again in a moment."
}

// --- Helper: Store Conversation ---
export const onStoreConversations = async (
  id: string,
  message: string,
  role: 'assistant' | 'user'
) => {
  await client.chatRoom.update({
    where: { id },
    data: {
      message: {
        create: { message, role },
      },
    },
  })
}

// --- Helper: Get ChatBot Config ---
export const onGetCurrentChatBot = async (id: string) => {
  try {
    if (!id || id === 'undefined') return null
    const sanitizedId = id.replace(/^["']|["']$/g, '')

    const chatbot = await client.domain.findUnique({
      where: { id: sanitizedId },
      select: {
        helpdesk: true,
        name: true,
        chatBot: {
          select: {
            id: true,
            welcomeMessage: true,
            icon: true,
            textColor: true,
            background: true,
            helpdesk: true,
          },
        },
      },
    })

    return chatbot
  } catch (error) {
    console.log('Error in onGetCurrentChatBot:', error)
    return null
  }
}

// --- Helper: Extract email from chat history ---
const onExtractEmailFromChatHistory = (chat: ChatTurn[]): string | undefined => {
  for (let i = chat.length - 1; i >= 0; i--) {
    const content = chat[i]?.content
    if (!content) continue
    const extracted = extractEmailsFromString(content)
    if (extracted?.length) {
      return extracted[0]
    }
  }
  return undefined
}

// --- Helper: Basic input sanitization ---
const sanitizeInput = (input: string): string => {
  const dangerousPatterns = [
    /ignore previous instructions/gi,
    /disregard all prior/gi,
    /system prompt/gi,
    /you are now/gi,
    /new role/gi,
  ]

  let sanitized = input
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '[filtered]')
  })

  return sanitized.slice(0, 2000)
}

// --- Main: AI Chat Bot Assistant ---
export const onAiChatBotAssistant = async (
  id: string,
  chat: ChatTurn[],
  author: 'user',
  message: string,
  chatRoomId?: string
) => {
  try {
    const sanitizedId = id.replace(/^["']|["']$/g, '')
    const sanitizedMessage = sanitizeInput(message)

    const chatBotDomain = await client.domain.findUnique({
      where: { id: sanitizedId },
      select: {
        name: true,
        User: {
          select: { email: true },
        },
        filterQuestions: {
          where: { answered: null },
          select: { question: true },
        },
      },
    })

    if (!chatBotDomain) {
      return {
        response: {
          role: 'assistant' as const,
          content: 'I could not find this chatbot domain.',
        },
      }
    }

    const extractedEmail = extractEmailsFromString(sanitizedMessage)
    const activeCustomerEmail = extractedEmail?.[0] || onExtractEmailFromChatHistory(chat)

    let activeRoom = chatRoomId
      ? await client.chatRoom.findFirst({
          where: {
            id: chatRoomId,
            Customer: { domainId: sanitizedId },
          },
          select: {
            id: true,
            live: true,
            mailed: true,
            customerId: true,
            Customer: {
              select: { id: true, email: true },
            },
          },
        })
      : null

    if (!activeRoom) {
      const createdCustomer = await client.customer.create({
        data: {
          domainId: sanitizedId,
          email: activeCustomerEmail || null,
          questions: {
            create: chatBotDomain.filterQuestions,
          },
          chatRoom: { create: {} },
        },
        select: {
          id: true,
          email: true,
          chatRoom: {
            select: {
              id: true,
              live: true,
              mailed: true,
              customerId: true,
            },
            take: 1,
          },
        },
      })

      activeRoom = {
        id: createdCustomer.chatRoom[0].id,
        live: createdCustomer.chatRoom[0].live,
        mailed: createdCustomer.chatRoom[0].mailed,
        customerId: createdCustomer.chatRoom[0].customerId,
        Customer: {
          id: createdCustomer.id,
          email: createdCustomer.email,
        },
      }
    }

    if (activeCustomerEmail && !activeRoom.Customer?.email) {
      await client.customer.update({
        where: { id: activeRoom.Customer?.id },
        data: { email: activeCustomerEmail },
      })
    }

    await onStoreConversations(activeRoom.id, sanitizedMessage, author)

    if (activeRoom.live) {
      onRealTimeChat(activeRoom.id, sanitizedMessage, 'user', author)

      if (!activeRoom.mailed && chatBotDomain.User?.email) {
        try {
          onMailer(chatBotDomain.User.email)
          await client.chatRoom.update({
            where: { id: activeRoom.id },
            data: { mailed: true },
          })
        } catch (mailErr) {
          console.log('Failed to send email notification:', mailErr)
        }
      }

      return { live: true, chatRoom: activeRoom.id }
    }

    const aiResponse = await onGenerateGeminiReply(
      `
        You are the AI sales assistant for ${chatBotDomain.name}.

        Priority rules (in this order):
        1) First answer the user's current question clearly and directly.
        2) Keep it concise, practical, and relevant to what they asked.
        3) After answering, ask at most one helpful follow-up question if needed.

        Lead-qualification rule:
        - You may ask questions from the list below naturally.
        - Add the keyword (complete) ONLY when you ask one of those listed questions.
        - Never append (complete) to general answers.

        Escalation rule:
        - If the user is abusive, harmful, or requests something clearly outside your scope, say a human will join and append (realtime).

        Link rules:
        - If user agrees to book an appointment, provide: ${APP_URL}/portal/${id}/appointment/${activeRoom.Customer?.id}
        - If user wants to buy a product, provide: ${APP_URL}/portal/${id}/payment/${activeRoom.Customer?.id}

        The array of questions: [${chatBotDomain.filterQuestions
          .map((q) => q.question)
          .join(', ')}]
      `,
      chat,
      sanitizedMessage
    )

    if (aiResponse?.includes('(realtime)')) {
      await client.chatRoom.update({
        where: { id: activeRoom.id },
        data: { live: true },
      })

      const response = {
        role: 'assistant' as const,
        content: aiResponse.replace('(realtime)', ''),
      }

      await onStoreConversations(activeRoom.id, response.content, 'assistant')

      return { response, live: true, chatRoom: activeRoom.id }
    }

    if (chat[chat.length - 1]?.content?.includes('(complete)')) {
      const firstUnansweredQuestion = await client.customerResponses.findFirst({
        where: {
          customerId: activeRoom.Customer?.id,
          answered: null,
        },
        select: { id: true },
        orderBy: { question: 'asc' },
      })
      if (firstUnansweredQuestion) {
        await client.customerResponses.update({
          where: { id: firstUnansweredQuestion.id },
          data: { answered: sanitizedMessage },
        })
      }
    }

    const generatedLink = extractURLfromString(aiResponse)
    if (generatedLink) {
      const link = generatedLink[0]
      const response = {
        role: 'assistant' as const,
        content: 'Great! you can follow the link to proceed',
        link: link.slice(0, -1),
      }

      await onStoreConversations(
        activeRoom.id,
        `${response.content} ${response.link}`,
        'assistant'
      )

      return { response, chatRoom: activeRoom.id }
    }

    const response = {
      role: 'assistant' as const,
      content: aiResponse,
    }

    await onStoreConversations(activeRoom.id, `${response.content}`, 'assistant')

    return { response, chatRoom: activeRoom.id }
  } catch (error) {
    console.log('AI Chat Bot Error:', error)
    return {
      response: {
        role: 'assistant' as const,
        content:
          "I'm having trouble responding right now. Please try again in a moment.",
      },
    }
  }
}
