import React from 'react'
import BreadCrumb from './bread-crumb'
import { Card } from '../ui/card'
import { Headphones, Star, Trash } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

type Props = {}

const InfoBar = (props: Props) => {
  return (
    <div className="flex w-full justify-between items-center py-1 mb-8">
      <BreadCrumb />
      <div className="flex gap-3 items-center">
        <div className="flex gap-3">
          <Card className="rounded-xl flex gap-3 py-3 px-4 text-ghost shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <Trash className="w-5 h-5" />
          </Card>
          <Card className="rounded-xl flex gap-3 py-3 px-4 text-ghost shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <Star className="w-5 h-5" />
          </Card>
        </div>
        <Avatar className="cursor-pointer shadow-sm">
          <AvatarFallback className="bg-orange text-white font-bold">
            <Headphones className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <Avatar className="cursor-pointer shadow-sm border-2 border-white">
          <AvatarImage
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop"
            alt="User"
          />
          <AvatarFallback className="bg-gray-200">US</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}

export default InfoBar
