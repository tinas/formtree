import { arrayOf, defineField, defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

const returnDateField = defineField({
  schema: z.iso.date({ error: 'Choose a return date' }),
})

const travelerGroup = defineGroup({
  schema: z.object({
    fullName: z.string({ error: 'Enter the full name' }).trim().min(1, {
      error: 'Enter the full name',
    }),
    birthDate: z.iso.date({ error: 'Enter the date of birth' }),
  }),
})

const travelersArray = arrayOf(travelerGroup)

export const bookingForm = defineGroup({
  schema: z.object({
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }),
    destination: z.string({ error: 'Choose a destination' }),
    departureDate: z.iso.date({ error: 'Choose a departure date' }),
  }),
  children: { returnDate: returnDateField, travelers: travelersArray },
  activeWhen: {
    returnDate: ({ value }) => value.tripType == TRIP_TYPE.roundTrip,
  },
})
