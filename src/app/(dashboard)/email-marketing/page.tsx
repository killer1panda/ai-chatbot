export const dynamic = 'force-dynamic'
import { onGetAllCampaigns, onGetAllCustomers } from '@/actions/mail'
import EmailMarketing from '@/components/email-marketing'
import InfoBar from '@/components/infobar'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import React from 'react'

type Props = {}

const Page = async (props: Props) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) return null
  const customers = await onGetAllCustomers(session.user.id)
  const campaigns = await onGetAllCampaigns(session.user.id)

  return (
    <>
      <InfoBar></InfoBar>
      <EmailMarketing
        campaign={campaigns?.campaign!}
        subscription={customers?.subscription!}
        domains={customers?.domains!}
      />
    </>
  )
}

export default Page
