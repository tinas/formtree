# Checking Across Rows

<script setup>
import BookingForm from './steps/list-rules/booking-form.vue'
</script>

<div class="vue-only">

Each traveler's group checks only its own values, so the booking goes through with no traveler at
all, or with children traveling alone. A rule about the travelers as a whole needs every row at
once.

</div>

## Checking the List

<div class="vue-only">

Give the list a rule in the `validate` option of `arrayOf`, which receives every traveler:

```ts [forms/booking.ts]
import { arrayOf, defineField, defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

const ADULT_AGE = 18 // [!code ++]

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

const travelersArray = arrayOf(travelerGroup) // [!code --]
const travelersArray = arrayOf(travelerGroup, { // [!code ++]
  validate: travelers => { // [!code ++]
    const hasAdult = travelers.some(traveler => isAdult(traveler.birthDate)) // [!code ++]
    return hasAdult ? undefined : { code: 'Add an adult traveler' } // [!code ++]
  }, // [!code ++]
}) // [!code ++]

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

function isAdult(birthDate: string | undefined) { // [!code ++]
  if (birthDate == undefined) { // [!code ++]
    return false // [!code ++]
  } // [!code ++]
  const adultSince = new Date(birthDate) // [!code ++]
  adultSince.setFullYear(adultSince.getFullYear() + ADULT_AGE) // [!code ++]
  return adultSince <= new Date() // [!code ++]
} // [!code ++]
```

The error has no `path`, so it belongs to the list itself. An empty list has no adult either, so it
fails the same rule.

</div>

## Showing the List's Error

<div class="vue-only">

The list's node has an `errorMessage` like a field's, so show it below the travelers:

```vue{33}
<template>
  <form novalidate @submit.prevent="bookTrip">
    <SelectField name="tripType" label="Trip" :options="TRIP_TYPE_OPTIONS" />
    <SelectField
      name="destination"
      label="Destination"
      :options="DESTINATION_OPTIONS"
    />
    <TextField name="departureDate" label="Departure" type="date" />
    <TextField
      v-if="returnDate.state.active"
      name="returnDate"
      label="Return"
      type="date"
    />

    <fieldset v-for="traveler in travelers.items" :key="traveler.key">
      <legend>Traveler {{ traveler.index + 1 }}</legend>
      <TextField
        :name="`travelers.${traveler.index}.fullName`"
        label="Full name"
      />
      <TextField
        :name="`travelers.${traveler.index}.birthDate`"
        label="Date of birth"
        type="date"
      />
      <button type="button" @click="travelers.remove(traveler.index)">
        Remove
      </button>
    </fieldset>
    <button type="button" @click="travelers.push({})">Add traveler</button>
    <p>{{ travelers.errorMessage }}</p>

    <button type="submit">Book trip</button>
  </form>
  <pre v-if="booking">{{ booking }}</pre>
</template>
```

The error shows once the list is touched, which adding or removing a traveler does, or after a
submit.

</div>

## Trying the Booking

<div class="vue-only">

<DemoFrame title="A rule across the travelers" class="tutorial-demo">
  <BookingForm />
</DemoFrame>

Book without a traveler, then add a child. The error stays until one of the travelers is an adult.

::: code-group

<<< ./steps/list-rules/booking-form.vue [booking-form.vue]

<<< ./steps/list-rules/select-field.vue [select-field.vue]

<<< ./steps/list-rules/text-field.vue [text-field.vue]

<<< ./steps/list-rules/forms/booking.ts [forms/booking.ts]

:::

</div>
