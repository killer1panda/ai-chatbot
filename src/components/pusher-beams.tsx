'use client'

import Script from 'next/script'

const PUSHER_BEAMS_INSTANCE_ID =
  process.env.NEXT_PUBLIC_PUSHER_BEAMS_INSTANCE_ID ||
  '8bcd72ce-d6f7-4f09-a318-b8f651b5a997'

export default function PusherBeams() {
  return (
    <Script
      src="https://js.pusher.com/beams/2.1.0/push-notifications-cdn.js"
      strategy="lazyOnload"
      onLoad={() => {
        if (typeof window !== 'undefined' && 'PusherPushNotifications' in window) {
          const beamsClient = new (window as any).PusherPushNotifications.Client({
            instanceId: PUSHER_BEAMS_INSTANCE_ID,
          })

          beamsClient
            .start()
            .then(() => beamsClient.addDeviceInterest('hello'))
            .then(() => console.log('Successfully registered and subscribed!'))
            .catch((err: any) => {
              if (err.name === 'AbortError') {
                console.warn(
                  'Pusher Beams: Registration denied (likely Incognito mode).'
                )
              } else {
                console.error('Pusher Beams Error:', err)
              }
            })
        }
      }}
    />
  )
}
