export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { client } from '@/lib/prisma'
import SideBar from '@/components/sidebar'
import { ChatProvider } from '@/context/user-chat-context'
import { redirect } from 'next/navigation'

const OwnerLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/sign-in')
  }

  const user = await client.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullname: true,
      email: true,
      domains: {
        select: {
          name: true,
          icon: true,
          id: true,
        },
      },
    },
  })

  if (!user) {
    redirect('/auth/sign-in')
  }

  return (
    <ChatProvider>
      <div className="flex h-screen w-full">
        <SideBar domains={user.domains || []} />
        <div className="w-full h-screen flex flex-col pl-20 md:pl-4">
          {children}
        </div>
      </div>
    </ChatProvider>
  )
}

export default OwnerLayout