'use client'

import { onCreateDashboardBooking } from '@/actions/appointment'
import { Loader } from '@/components/loader'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { APPOINTMENT_TIME_SLOTS } from '@/constants/timeslots'
import { cn } from '@/lib/utils'
import React, { useMemo, useState } from 'react'

type BookingWorkflowProps = {
  domains: {
    id: string
    name: string
  }[]
  bookings:
    | {
        date: Date
        slot: string
        domainId: string | null
      }[]
    | undefined
}

const isSameDay = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const BookingWorkflow = ({ domains, bookings }: BookingWorkflowProps) => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [date, setDate] = useState<Date | undefined>(new Date())
  const [email, setEmail] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [selectedDomainId, setSelectedDomainId] = useState<string>(domains[0]?.id || '')
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()

  const reloadAppointmentsPage = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/appointment')
    }
  }

  const bookedSlots = useMemo(() => {
    if (!date || !selectedDomainId || !bookings) return []

    return bookings
      .filter(
        (booking) =>
          booking.domainId === selectedDomainId && isSameDay(new Date(booking.date), date)
      )
      .map((booking) => booking.slot)
  }, [bookings, date, selectedDomainId])

  const onCreateBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedDomainId || !date || !selectedSlot || !email.trim()) {
      toast({
        title: 'Missing details',
        description: 'Please select a domain, date, slot and email.',
        variant: 'destructive',
      })
      return
    }

    if (date < todayStart) {
      toast({
        title: 'Invalid date',
        description: 'Past dates are not allowed.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const response = await onCreateDashboardBooking(
        selectedDomainId,
        email,
        selectedSlot,
        date.toISOString()
      )

      if (response?.status === 200) {
        toast({
          title: 'Booking created',
          description: response.message,
        })
        setEmail('')
        setSelectedSlot('')
        reloadAppointmentsPage()
        return
      }

      toast({
        title: 'Unable to create booking',
        description: response?.message || 'Please try again.',
        variant: 'destructive',
      })
    } catch (error) {
      toast({
        title: 'Unable to create booking',
        description: 'Something went wrong while creating this booking.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!domains.length) {
    return (
      <Card className="rounded-xl mt-4 p-4">
        <CardDescription>
          Add a domain in settings before you start creating appointments.
        </CardDescription>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl mt-4 p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base">Create New Booking</CardTitle>
        <CardDescription>
          Pick a date, choose a free slot and add a customer email.
        </CardDescription>
      </CardHeader>

      <form
        className="space-y-4"
        onSubmit={onCreateBooking}
      >
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <select
            id="domain"
            className="w-full border rounded-md h-10 px-3 text-sm"
            value={selectedDomainId}
            onChange={(event) => setSelectedDomainId(event.target.value)}
          >
            {domains.map((domain) => (
              <option
                key={domain.id}
                value={domain.id}
              >
                {domain.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-2 inline-block">Date</Label>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={{ before: todayStart }}
            className="rounded-md border"
          />
        </div>

        <div className="space-y-2">
          <Label>Time Slot</Label>
          <div className="grid grid-cols-2 gap-2">
            {APPOINTMENT_TIME_SLOTS.map((slot) => {
              const isBooked = bookedSlots.includes(slot.slot)
              return (
                <button
                  type="button"
                  key={slot.slot}
                  disabled={isBooked}
                  onClick={() => setSelectedSlot(slot.slot)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm text-left transition',
                    selectedSlot === slot.slot
                      ? 'bg-grandis border-orange'
                      : 'bg-peach border-orange',
                    isBooked ? 'cursor-not-allowed bg-gray-200 border-gray-200 text-muted-foreground' : 'hover:bg-grandis'
                  )}
                >
                  {slot.slot}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-email">Customer Email</Label>
          <Input
            id="booking-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="customer@email.com"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          <Loader
            loading={loading}
            noPadding
          >
            Create Booking
          </Loader>
        </Button>
      </form>
    </Card>
  )
}

export default BookingWorkflow