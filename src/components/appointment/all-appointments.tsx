"use client"

import {
  onCancelDashboardBooking,
  onRescheduleDashboardBooking,
} from '@/actions/appointment'
import { APPOINTMENT_TABLE_HEADER } from '@/constants/menu'
import { APPOINTMENT_TIME_SLOTS } from '@/constants/timeslots'
import React from 'react'
import { DataTable } from '../table'
import { Button } from '../ui/button'
import { TableCell, TableRow } from '../ui/table'
import { getMonthName } from '@/lib/utils'
import { CardDescription } from '../ui/card'
import { useToast } from '../ui/use-toast'

type Props = {
  bookings:
    | {
        Customer: {
          Domain: {
            name: string
          } | null
        } | null
        id: string
        email: string
        domainId: string | null
        date: Date
        slot: string
        createdAt: Date
      }[]
    | undefined
}

const AllAppointments = ({ bookings }: Props) => {
  const { toast } = useToast()
  const [editingBookingId, setEditingBookingId] = React.useState<string | null>(
    null
  )
  const [rescheduleDate, setRescheduleDate] = React.useState<string>('')
  const [rescheduleSlot, setRescheduleSlot] = React.useState<string>('')
  const [loadingBookingId, setLoadingBookingId] = React.useState<string | null>(
    null
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const reloadAppointmentsPage = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/appointment')
    }
  }

  const toDate = (date: Date | string) => new Date(date)

  const toInputDate = (date: Date | string) => {
    const parsedDate = toDate(date)
    const year = parsedDate.getFullYear()
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const day = String(parsedDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  const onCancel = async (bookingId: string) => {
    try {
      setLoadingBookingId(bookingId)
      const response = await onCancelDashboardBooking(bookingId)

      if (response?.status === 200) {
        toast({ title: 'Success', description: response.message })
        reloadAppointmentsPage()
        return
      }

      toast({
        title: 'Unable to cancel',
        description: response?.message || 'Please try again.',
        variant: 'destructive',
      })
    } catch (error) {
      toast({
        title: 'Unable to cancel',
        description: 'Something went wrong while cancelling booking.',
        variant: 'destructive',
      })
    } finally {
      setLoadingBookingId(null)
    }
  }

  const onStartReschedule = (booking: NonNullable<Props['bookings']>[number]) => {
    setEditingBookingId(booking.id)
    setRescheduleDate(toInputDate(booking.date))
    setRescheduleSlot(booking.slot)
  }

  const onSubmitReschedule = async (bookingId: string) => {
    if (!rescheduleDate || !rescheduleSlot) {
      toast({
        title: 'Missing details',
        description: 'Please select a date and time slot.',
        variant: 'destructive',
      })
      return
    }

    const selectedDate = new Date(`${rescheduleDate}T00:00:00`)

    if (selectedDate < today) {
      toast({
        title: 'Invalid date',
        description: 'Past dates are not allowed.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoadingBookingId(bookingId)
      const response = await onRescheduleDashboardBooking(
        bookingId,
        rescheduleSlot,
        rescheduleDate
      )

      if (response?.status === 200) {
        toast({ title: 'Success', description: response.message })
        setEditingBookingId(null)
        reloadAppointmentsPage()
        return
      }

      toast({
        title: 'Unable to reschedule',
        description: response?.message || 'Please try again.',
        variant: 'destructive',
      })
    } catch (error) {
      toast({
        title: 'Unable to reschedule',
        description: 'Something went wrong while rescheduling booking.',
        variant: 'destructive',
      })
    } finally {
      setLoadingBookingId(null)
    }
  }

  return (
    <DataTable headers={APPOINTMENT_TABLE_HEADER}>
      {bookings ? (
        bookings.map((booking) => {
          const bookingDate = toDate(booking.date)
          const createdAt = toDate(booking.createdAt)

          const availableSlots = APPOINTMENT_TIME_SLOTS.filter((slotItem) => {
            if (!rescheduleDate || editingBookingId !== booking.id) return true

            const selectedDate = new Date(`${rescheduleDate}T00:00:00`)

            return !bookings.some(
              (existingBooking) =>
                existingBooking.id !== booking.id &&
                existingBooking.domainId === booking.domainId &&
                existingBooking.slot === slotItem.slot &&
                isSameDay(toDate(existingBooking.date), selectedDate)
            )
          })

          const minDate = toInputDate(today)

          return (
            <React.Fragment key={booking.id}>
              <TableRow>
                <TableCell>{booking.email}</TableCell>
                <TableCell>
                  <div>
                    {getMonthName(bookingDate.getMonth())} {bookingDate.getDate()}{' '}
                    {bookingDate.getFullYear()}
                  </div>
                  <div className="uppercase">{booking.slot}</div>
                </TableCell>
                <TableCell>
                  <div>
                    {getMonthName(createdAt.getMonth())} {createdAt.getDate()}{' '}
                    {createdAt.getFullYear()}
                  </div>
                  <div>
                    {createdAt.getHours()} {createdAt.getMinutes()}{' '}
                    {createdAt.getHours() > 12 ? 'PM' : 'AM'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {booking.Customer?.Domain?.name}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onStartReschedule(booking)}
                      disabled={loadingBookingId === booking.id}
                    >
                      Reschedule
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onCancel(booking.id)}
                      disabled={loadingBookingId === booking.id}
                    >
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {editingBookingId === booking.id && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Date</label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          min={minDate}
                          onChange={(event) => setRescheduleDate(event.target.value)}
                          className="border rounded-md h-9 px-3 text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Slot</label>
                        <select
                          value={rescheduleSlot}
                          onChange={(event) => setRescheduleSlot(event.target.value)}
                          className="border rounded-md h-9 px-3 text-sm"
                        >
                          {availableSlots.map((slotItem) => (
                            <option
                              key={slotItem.slot}
                              value={slotItem.slot}
                            >
                              {slotItem.slot}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onSubmitReschedule(booking.id)}
                          disabled={loadingBookingId === booking.id}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingBookingId(null)}
                          disabled={loadingBookingId === booking.id}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          )
        })
      ) : (
        <CardDescription>No Appointments</CardDescription>
      )}
    </DataTable>
  )
}

export default AllAppointments
