import type { Destination } from '../api'
import { arrayOf, defineField, defineGroupWithDeps } from '@formtree/vue'
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

const ADULT_AGE = 18

const returnDateField = defineField({
  schema: z.iso.date({ error: 'Choose a return date' }),
})

const passportNumberField = defineField({
  schema: z.string({ error: 'Enter the passport number' }).trim().min(1, {
    error: 'Enter the passport number',
  }),
})

interface TravelerDeps {
  readonly international: boolean
}

const travelerGroup = defineGroupWithDeps<TravelerDeps>()({
  schema: z.object({
    fullName: z.string({ error: 'Enter the full name' }).trim().min(1, {
      error: 'Enter the full name',
    }),
    birthDate: z.iso.date({ error: 'Enter the date of birth' }),
  }),
  children: { passportNumber: passportNumberField },
  activeWhen: {
    passportNumber: ({ deps }) => deps.international,
  },
})

const travelersArray = arrayOf(travelerGroup, {
  validate: travelers => {
    const hasAdult = travelers.some(traveler => isAdult(traveler.birthDate))
    return hasAdult ? undefined : { code: 'Add an adult traveler' }
  },
})

interface BookingDeps {
  readonly destinations: ReadonlyArray<Destination>
}

export const bookingForm = defineGroupWithDeps<BookingDeps>()({
  schema: z.object({
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }),
    destination: z.string({ error: 'Choose a destination' }),
    departureDate: z.iso.date({ error: 'Choose a departure date' }),
  }),
  children: { returnDate: returnDateField, travelers: travelersArray },
  activeWhen: {
    returnDate: ({ value }) => value.tripType == TRIP_TYPE.roundTrip,
  },
  childDeps: {
    travelers: ({ value, deps }) => ({
      international: deps.destinations.some(
        destination => destination.code == value.destination && destination.international,
      ),
    }),
  },
})

function isAdult(birthDate: string | undefined) {
  if (birthDate == undefined) {
    return false
  }
  const adultSince = new Date(birthDate)
  adultSince.setFullYear(adultSince.getFullYear() + ADULT_AGE)
  return adultSince <= new Date()
}
