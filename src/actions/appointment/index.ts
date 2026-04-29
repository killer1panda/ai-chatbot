'use server'

import { client } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const onDomainCustomerResponses = async (customerId: string) => {
  try {
    const customerQuestions = await client.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        email: true,
        questions: {
          select: {
            id: true,
            question: true,
            answered: true,
          },
        },
      },
    })

    if (customerQuestions) {
      return customerQuestions
    }
  } catch (error) {
    console.log(error)
  }
}

export const onGetAllDomainBookings = async (domainId: string) => {
  try {
    const bookings = await client.bookings.findMany({
      where: {
        domainId,
      },
      select: {
        slot: true,
        date: true,
      },
    })

    if (bookings) {
      return bookings
    }
  } catch (error) {
    console.log(error)
  }
}

export const onBookNewAppointment = async (
  domainId: string,
  customerId: string,
  slot: string,
  date: string,
  email: string
) => {
  try {
    const normalizedDate = normalizeAppointmentDate(date)

    if (!normalizedDate) {
      return { status: 400, message: 'Invalid appointment date' }
    }

    if (isPastAppointmentDate(normalizedDate)) {
      return { status: 400, message: 'Past dates are not allowed' }
    }

    const booking = await client.customer.update({
      where: {
        id: customerId,
      },
      data: {
        booking: {
          create: {
            domainId,
            slot,
            date: normalizedDate,
            email,
          },
        },
      },
    })

    if (booking) {
      return { status: 200, message: 'Booking created' }
    }
  } catch (error) {
    console.log(error)
  }
}

const normalizeAppointmentDate = (date: string | Date) => {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    0,
    0,
    0,
    0
  )
}

const isPastAppointmentDate = (date: Date) => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  return date < todayStart
}

export const onCreateDashboardBooking = async (
  domainId: string,
  email: string,
  slot: string,
  date: string
) => {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { status: 401, message: 'Unauthorized' }
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !slot || !domainId || !date) {
      return { status: 400, message: 'Missing required booking details' }
    }

    const normalizedDate = normalizeAppointmentDate(date)

    if (!normalizedDate) {
      return { status: 400, message: 'Invalid appointment date' }
    }

    if (isPastAppointmentDate(normalizedDate)) {
      return { status: 400, message: 'Past dates are not allowed' }
    }

    const domain = await client.domain.findFirst({
      where: {
        id: domainId,
        User: {
          id: session.user.id,
        },
      },
      select: {
        id: true,
      },
    })

    if (!domain) {
      return { status: 403, message: 'You do not have access to this domain' }
    }

    const slotAlreadyBooked = await client.bookings.findFirst({
      where: {
        domainId,
        slot,
        date: normalizedDate,
      },
      select: {
        id: true,
      },
    })

    if (slotAlreadyBooked) {
      return {
        status: 409,
        message: 'This time slot is already booked for the selected date',
      }
    }

    let customer = await client.customer.findFirst({
      where: {
        domainId,
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    })

    if (!customer) {
      customer = await client.customer.create({
        data: {
          domainId,
          email: normalizedEmail,
        },
        select: {
          id: true,
        },
      })
    }

    const booking = await client.bookings.create({
      data: {
        domainId,
        customerId: customer.id,
        email: normalizedEmail,
        slot,
        date: normalizedDate,
      },
      select: {
        id: true,
      },
    })

    if (booking) {
      return { status: 200, message: 'Booking created successfully' }
    }

    return { status: 500, message: 'Unable to create booking' }
  } catch (error) {
    console.log(error)
    return { status: 500, message: 'Unable to create booking' }
  }
}

export const onCancelDashboardBooking = async (bookingId: string) => {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { status: 401, message: 'Unauthorized' }
    }

    const booking = await client.bookings.findFirst({
      where: {
        id: bookingId,
        Customer: {
          Domain: {
            User: {
              id: session.user.id,
            },
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (!booking) {
      return { status: 404, message: 'Booking not found' }
    }

    await client.bookings.delete({
      where: {
        id: bookingId,
      },
    })

    return { status: 200, message: 'Booking cancelled' }
  } catch (error) {
    console.log(error)
    return { status: 500, message: 'Unable to cancel booking' }
  }
}

export const onRescheduleDashboardBooking = async (
  bookingId: string,
  slot: string,
  date: string
) => {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { status: 401, message: 'Unauthorized' }
    }

    if (!slot || !date) {
      return { status: 400, message: 'Missing required booking details' }
    }

    const normalizedDate = normalizeAppointmentDate(date)

    if (!normalizedDate) {
      return { status: 400, message: 'Invalid appointment date' }
    }

    if (isPastAppointmentDate(normalizedDate)) {
      return { status: 400, message: 'Past dates are not allowed' }
    }

    const booking = await client.bookings.findFirst({
      where: {
        id: bookingId,
        Customer: {
          Domain: {
            User: {
              id: session.user.id,
            },
          },
        },
      },
      select: {
        id: true,
        domainId: true,
      },
    })

    if (!booking) {
      return { status: 404, message: 'Booking not found' }
    }

    if (!booking.domainId) {
      return { status: 400, message: 'Booking is missing a domain' }
    }

    const slotAlreadyBooked = await client.bookings.findFirst({
      where: {
        id: {
          not: bookingId,
        },
        domainId: booking.domainId,
        slot,
        date: normalizedDate,
      },
      select: {
        id: true,
      },
    })

    if (slotAlreadyBooked) {
      return {
        status: 409,
        message: 'This time slot is already booked for the selected date',
      }
    }

    await client.bookings.update({
      where: {
        id: bookingId,
      },
      data: {
        slot,
        date: normalizedDate,
      },
    })

    return { status: 200, message: 'Booking rescheduled' }
  } catch (error) {
    console.log(error)
    return { status: 500, message: 'Unable to reschedule booking' }
  }
}

export const saveAnswers = async (
  questions: [question: string],
  customerId: string
) => {
  try {
    for (const question in questions) {
      await client.customer.update({
        where: { id: customerId },
        data: {
          questions: {
            update: {
              where: {
                id: question,
              },
              data: {
                answered: questions[question],
              },
            },
          },
        },
      })
    }
    return {
      status: 200,
      messege: 'Updated Responses',
    }
  } catch (error) {
    console.log(error)
  }
}

export const onGetAllBookingsForCurrentUser = async (id: string) => {
  try {
    const bookings = await client.bookings.findMany({
      where: {
        Customer: {
          Domain: {
            User: {
              id,
            },
          },
        },
      },
      select: {
        id: true,
        slot: true,
        createdAt: true,
        date: true,
        email: true,
        domainId: true,
        Customer: {
          select: {
            Domain: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (bookings) {
      return {
        bookings,
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const getUserAppointments = async () => {
  try {
    const session = await auth()
    if (session?.user?.id) {
      const bookings = await client.bookings.count({
        where: {
          Customer: {
            Domain: {
              User: {
                id: session.user.id,
              },
            },
          },
        },
      })

      if (bookings) {
        return bookings
      }
    }
  } catch (error) {
    console.log(error)
  }
}
