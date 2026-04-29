'use client'

import Pusher from 'pusher-js'

export const pusherClient = 
  typeof window !== 'undefined'
    ? new Pusher(
        process.env.NEXT_PUBLIC_PUSHER_APP_KEY as string,
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTOR as string,
        }
      )
    : ({} as any)
