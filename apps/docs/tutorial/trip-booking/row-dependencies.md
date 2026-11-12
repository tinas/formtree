# Passing an Answer Down

<script setup>
import BookingForm from './steps/row-dependencies/booking-form.vue'
</script>

<div class="vue-only">

A trip abroad needs a passport number from every traveler, and only the destination tells whether
the trip goes abroad. A traveler's group sees only its own values, so the booking has to hand the
answer down to every row.

</div>

## Declaring What a Traveler Needs

<div class="vue-only">

A definition that needs data from its parent declares that data as dependencies. Define the
traveler with `defineGroupWithDeps` and the type of the data, and turn the passport number on with
it:

```ts [forms/booking.ts]
import { arrayOf, defineField, defineGroup } from '@formtree/vue' // [!code --]
import { arrayOf, defineField, defineGroup, defineGroupWithDeps } from '@formtree/vue' // [!code ++]
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

const ADULT_AGE = 18

const returnDateField = defineField({
  schema: z.iso.date({ error: 'Choose a return date' }),
})

const passportNumberField = defineField({ // [!code ++]
  schema: z.string({ error: 'Enter the passport number' }).trim().min(1, { // [!code ++]
    error: 'Enter the passport number', // [!code ++]
  }), // [!code ++]
}) // [!code ++]

interface TravelerDeps { // [!code ++]
  readonly international: boolean // [!code ++]
} // [!code ++]

const travelerGroup = defineGroup({ // [!code --]
const travelerGroup = defineGroupWithDeps<TravelerDeps>()({ // [!code ++]
  schema: z.object({
    fullName: z.string({ error: 'Enter the full name' }).trim().min(1, {
      error: 'Enter the full name',
    }),
    birthDate: z.iso.date({ error: 'Enter the date of birth' }),
  }),
  children: { passportNumber: passportNumberField }, // [!code ++]
  activeWhen: { // [!code ++]
    passportNumber: ({ deps }) => deps.international, // [!code ++]
  }, // [!code ++]
})
```

Every function in the options receives `deps`, so the passport number applies only while
`international` is true.

</div>

## Passing the Answer to Each Row

<div class="vue-only">

A group hands its children their dependencies with `childDeps`, here built from the booking's own
destination:

```ts [forms/booking.ts]
const INTERNATIONAL_DESTINATIONS = ['lisbon', 'tokyo'] // [!code ++]

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
  childDeps: { // [!code ++]
    travelers: ({ value }) => ({ // [!code ++]
      international: INTERNATIONAL_DESTINATIONS.some(code => code == value.destination), // [!code ++]
    }), // [!code ++]
  }, // [!code ++]
})
```

The list passes them on to every traveler, so choosing Lisbon turns on the passport number in every
row at once.

::: info Why Data Flows Down
Dependencies flow only from a parent to its children, and a row never reads the form around it. The
traveler's definition works in any form that tells it whether the trip is international, and the
booking decides that in one place.
:::

</div>

## Showing the Passport Number

<div class="vue-only">

Each of `travelers.items` is a traveler's node, so render its passport number while it is active:

```vue{28-32}
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
      <TextField
        v-if="traveler.field('passportNumber').state.active"
        :name="`travelers.${traveler.index}.passportNumber`"
        label="Passport number"
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

A traveler added to an international trip asks for the passport number from the start.

</div>

## Trying the Booking

<div class="vue-only">

<DemoFrame title="Passport numbers for trips abroad" class="tutorial-demo">
  <BookingForm />
</DemoFrame>

Add two travelers and choose Lisbon. Both ask for a passport number, and choosing Denver turns them
off again.

::: code-group

<<< ./steps/row-dependencies/booking-form.vue [booking-form.vue]

<<< ./steps/row-dependencies/select-field.vue [select-field.vue]

<<< ./steps/row-dependencies/text-field.vue [text-field.vue]

<<< ./steps/row-dependencies/forms/booking.ts [forms/booking.ts]

:::

</div>
