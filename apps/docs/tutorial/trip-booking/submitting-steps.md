# Booking in Steps

<script setup>
import BookingForm from './steps/submitting-steps/booking-form.vue'
</script>

<div class="vue-only">

The booking asks for everything on one page, and Book trip on an empty booking shows every error at
once, from the destination down to the last traveler. A booking this long reads better in steps, and
the button of each step should check only what that step shows.

</div>

## Grouping the Dates

<div class="vue-only">

Every node in a form can be submitted on its own, so each step needs a node. The destination already
has one as a key of the booking, and so do the travelers as a list. Only the dates have none, so
define them as a group:

```ts [forms/booking.ts]
import type { Destination } from '../api'
import { arrayOf, defineField, defineGroupWithDeps } from '@formtree/vue' // [!code --]
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

const datesGroup = defineGroup({ // [!code ++]
  schema: z.object({ // [!code ++]
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }), // [!code ++]
    departureDate: z.iso.date({ error: 'Choose a departure date' }), // [!code ++]
  }), // [!code ++]
  children: { returnDate: returnDateField }, // [!code ++]
  activeWhen: { // [!code ++]
    returnDate: ({ value }) => value.tripType == TRIP_TYPE.roundTrip, // [!code ++]
  }, // [!code ++]
}) // [!code ++]
```

The group takes the return date along, together with the condition that reads the trip type next to
it.

</div>

## Adding the Group to the Booking

<div class="vue-only">

Replace the trip type and the dates in the booking with the group, under the key `dates`:

```ts [forms/booking.ts]
export const bookingForm = defineGroupWithDeps<BookingDeps>()({
  schema: z.object({
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }), // [!code --]
    destination: z.string({ error: 'Choose a destination' }),
    departureDate: z.iso.date({ error: 'Choose a departure date' }), // [!code --]
  }),
  children: { returnDate: returnDateField, travelers: travelersArray }, // [!code --]
  children: { dates: datesGroup, travelers: travelersArray }, // [!code ++]
  activeWhen: { // [!code --]
    returnDate: ({ value }) => value.tripType == TRIP_TYPE.roundTrip, // [!code --]
  }, // [!code --]
  childDeps: {
    travelers: ({ value, deps }) => ({
      international: deps.destinations.some(
        destination => destination.code == value.destination && destination.international,
      ),
    }),
  },
})
```

The booking now holds the dates under `dates`, so their names start with it, such as
`dates.departureDate`.

::: info Why the Destination Stays a Key
A group builds its children's dependencies from its own keys, and a group beside the travelers could
pass them nothing. The destination decides whether the travelers need a passport number, so it stays
a key of the booking, the parent of every step.
:::

</div>

## Submitting One Step

<div class="vue-only">

Every node has its own `handleSubmit`. Keep the current step in a ref, and give the destination and
the dates a submit function each that moves on to the next step:

```vue [booking-form.vue]
<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import type { Destination } from './api'
import { provideFormNode, useForm } from '@formtree/vue'
import { computed, ref, shallowRef } from 'vue'
import { fetchDestinations } from './api'
import { bookingForm, TRIP_TYPE } from './forms/booking'
import SelectField from './select-field.vue'
import TextField from './text-field.vue'

const STEP = { // [!code ++]
  destination: 'destination', // [!code ++]
  dates: 'dates', // [!code ++]
  travelers: 'travelers', // [!code ++]
} as const // [!code ++]

type Step = (typeof STEP)[keyof typeof STEP] // [!code ++]

const TRIP_TYPE_OPTIONS = [
  { value: TRIP_TYPE.oneWay, label: 'One way' },
  { value: TRIP_TYPE.roundTrip, label: 'Round trip' },
]

const destinations = ref<ReadonlyArray<Destination>>([])
const destinationOptions = computed(() =>
  destinations.value.map(destination => ({
    value: destination.code,
    label: destination.city,
  })),
)

const form = useForm(bookingForm, {
  deps: () => ({ destinations: destinations.value }),
})
provideFormNode(form)
const returnDate = form.field('returnDate') // [!code --]
const returnDate = form.field('dates.returnDate') // [!code ++]
const travelers = form.array('travelers')
const step = ref<Step>(STEP.destination) // [!code ++]
const booking = shallowRef<OutputOf<typeof bookingForm>>()

const submitDestination = form.field('destination').handleSubmit(() => { // [!code ++]
  step.value = STEP.dates // [!code ++]
}) // [!code ++]

const submitDates = form.group('dates').handleSubmit(() => { // [!code ++]
  step.value = STEP.travelers // [!code ++]
}) // [!code ++]

const bookTrip = form.handleSubmit(trip => {
  booking.value = trip
})

fetchDestinations().then(list => {
  destinations.value = list
})
</script>
```

A step's submit checks only its node and what is below it, so errors in the other steps neither stop
it nor show. Book trip still submits the whole booking.

</div>

## Showing One Step at a Time

<div class="vue-only">

Give each step a form of its own that submits it, with a Back button to the step before:

```vue{2-6,13-14,16-22,25,30-34,36,60-63}
<template>
  <form
    v-if="step == STEP.destination"
    novalidate
    @submit.prevent="submitDestination"
  >
    <SelectField
      name="destination"
      label="Destination"
      :options="destinationOptions"
    />

    <button type="submit">Continue</button>
  </form>

  <form v-else-if="step == STEP.dates" novalidate @submit.prevent="submitDates">
    <SelectField
      name="dates.tripType"
      label="Trip"
      :options="TRIP_TYPE_OPTIONS"
    />
    <TextField name="dates.departureDate" label="Departure" type="date" />
    <TextField
      v-if="returnDate.state.active"
      name="dates.returnDate"
      label="Return"
      type="date"
    />

    <div>
      <button type="button" @click="step = STEP.destination">Back</button>
      <button type="submit">Continue</button>
    </div>
  </form>

  <form v-else novalidate @submit.prevent="bookTrip">
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

    <div>
      <button type="button" @click="step = STEP.dates">Back</button>
      <button type="submit">Book trip</button>
    </div>
  </form>
  <pre v-if="booking">{{ booking }}</pre>
</template>
```

Going back takes a step's inputs off the page, but their values stay in the form, so every input
shows what it held.

</div>

## Trying the Booking

<div class="vue-only">

<DemoFrame title="A booking in three steps" class="tutorial-demo">
  <BookingForm />
</DemoFrame>

Press Continue without a destination, and only its error shows. Then choose Tokyo and the dates, add
a traveler, and go back a step. Every step keeps its values, and the traveler still asks for a
passport number.

::: code-group

<<< ./steps/submitting-steps/booking-form.vue [booking-form.vue]

<<< ./steps/submitting-steps/select-field.vue [select-field.vue]

<<< ./steps/submitting-steps/text-field.vue [text-field.vue]

<<< ./steps/submitting-steps/forms/booking.ts [forms/booking.ts]

<<< ./steps/submitting-steps/api.ts [api.ts]

:::

</div>
