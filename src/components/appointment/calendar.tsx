'use client'
import React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card } from '@/components/ui/card'

type Props = {}

const AppointmentCalendar = (props: Props) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <Card className="flex-1 flex flex-col py-5 items-center justify-center mt-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    </Card>
  )
}

export default AppointmentCalendar
