'use client'
import { useConversation } from '@/hooks/conversation/use-conversation'
import React from 'react'
import TabsMenu from '../tabs/intex'
import { TABS_MENU } from '@/constants/menu'
import { TabsContent } from '../ui/tabs'
import ConversationSearch from './search'
import { Loader } from '../loader'
import ChatCard from './chat-card'
import { CardDescription } from '../ui/card'
import { Separator } from '../ui/separator'

type ConversationRoom = {
  email: string | null
  chatRoom: {
    id: string
    createdAt: Date
    message: {
      message: string
      createdAt: Date
      seen: boolean
    }[]
  }[]
}

type Props = {
  domains?:
    | {
        name: string
        id: string
        icon: string
      }[]
    | undefined
}

const ConversationMenu = ({ domains }: Props) => {
  const { register, chatRooms, loading, onGetActiveChatMessages } =
    useConversation()

  const normalizedRooms = React.useMemo(() => {
    return chatRooms
      .map((room) => {
        const activeChatRoom = room.chatRoom?.[0]
        const latestMessage = activeChatRoom?.message?.[0]

        return {
          email: room.email,
          chatRoom: activeChatRoom,
          latestMessage,
        }
      })
      .filter((room) => room.chatRoom)
  }, [chatRooms])

  const unreadRooms = normalizedRooms.filter(
    (room) => room.latestMessage && room.latestMessage.seen === false
  )

  const allRooms = normalizedRooms

  const expiredRooms = normalizedRooms.filter((room) => {
    if (!room.latestMessage?.createdAt) return true

    const messageDate = new Date(room.latestMessage.createdAt)
    const diffHours =
      (Date.now() - messageDate.getTime()) / (1000 * 60 * 60)

    return diffHours >= 24
  })

  const starredRooms = normalizedRooms.filter((room) => {
    if (!room.latestMessage?.createdAt) return false

    const messageDate = new Date(room.latestMessage.createdAt)
    const diffHours =
      (Date.now() - messageDate.getTime()) / (1000 * 60 * 60)

    return room.latestMessage.seen === false && diffHours < 24
  })

  const renderRooms = (
    rooms: typeof normalizedRooms,
    emptyMessage: string
  ) => {
    return rooms.length ? (
      rooms.map((room) => (
        <ChatCard
          key={room.chatRoom.id}
          seen={room.latestMessage?.seen}
          id={room.chatRoom.id}
          onChat={() => onGetActiveChatMessages(room.chatRoom.id)}
          createdAt={room.latestMessage?.createdAt || room.chatRoom.createdAt}
          title={room.email || 'Unknown customer'}
          description={room.latestMessage?.message}
        />
      ))
    ) : (
      <CardDescription>{emptyMessage}</CardDescription>
    )
  }

  return (
    <div className="py-3 px-0">
      <TabsMenu triggers={TABS_MENU}>
        <TabsContent value="unread">
          <ConversationSearch
            domains={domains}
            register={register}
          />
          <div className="flex flex-col">
            <Loader loading={loading}>
              {renderRooms(unreadRooms, 'No unread chats for this domain')}
            </Loader>
          </div>
        </TabsContent>
        <TabsContent value="all">
          <ConversationSearch
            domains={domains}
            register={register}
          />
          <Separator
            orientation="horizontal"
            className="mt-5"
          />
          <Loader loading={loading}>
            <div className="flex flex-col">
              {renderRooms(allRooms, 'No chats available for this domain')}
            </div>
          </Loader>
        </TabsContent>
        <TabsContent value="expired">
          <ConversationSearch
            domains={domains}
            register={register}
          />
          <Separator
            orientation="horizontal"
            className="mt-5"
          />
          <Loader loading={loading}>
            <div className="flex flex-col">
              {renderRooms(expiredRooms, 'No expired chats for this domain')}
            </div>
          </Loader>
        </TabsContent>
        <TabsContent value="starred">
          <ConversationSearch
            domains={domains}
            register={register}
          />
          <Separator
            orientation="horizontal"
            className="mt-5"
          />
          <Loader loading={loading}>
            <div className="flex flex-col">
              {renderRooms(starredRooms, 'No priority chats for this domain')}
            </div>
          </Loader>
        </TabsContent>
      </TabsMenu>
    </div>
  )
}

export default ConversationMenu
