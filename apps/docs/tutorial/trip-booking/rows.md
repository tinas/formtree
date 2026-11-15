# Adding and Removing Rows

<script setup>
import BookingForm from './steps/rows/booking-form.vue'
</script>

<div class="vue-only">

The booking says where the trip goes, but not who travels. Every traveler needs a name and a date
of birth, and a booking may hold a single traveler or a whole family, so the form needs a part that
repeats.

</div>

## Defining a Traveler

<div class="vue-only">

A single traveler is defined as a group, and `arrayOf` wraps it into a list of travelers:

```ts [forms/booking.ts]
import { defineField, defineGroup } from '@formtree/vue' // [!code --]
import { arrayOf, defineField, defineGroup } from '@formtree/vue' // [!code ++]
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

const returnDateField = defineField({
  schema: z.iso.date({ error: 'Choose a return date' }),
})

const travelerGroup = defineGroup({ // [!code ++]
  schema: z.object({ // [!code ++]
    fullName: z.string({ error: 'Enter the full name' }).trim().min(1, { // [!code ++]
      error: 'Enter the full name', // [!code ++]
    }), // [!code ++]
    birthDate: z.iso.date({ error: 'Enter the date of birth' }), // [!code ++]
  }), // [!code ++]
}) // [!code ++]

const travelersArray = arrayOf(travelerGroup) // [!code ++]

export const bookingForm = defineGroup({
  schema: z.object({
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }),
    destination: z.string({ error: 'Choose a destination' }),
    departureDate: z.iso.date({ error: 'Choose a departure date' }),
  }),
  children: { returnDate: returnDateField }, // [!code --]
  children: { returnDate: returnDateField, travelers: travelersArray }, // [!code ++]
  activeWhen: {
    returnDate: ({ value }) => value.tripType == TRIP_TYPE.roundTrip,
  },
})
```

Each traveler in the list is a node of `travelerGroup`, and a new booking starts with an empty list.

</div>

## Adding a Traveler

<div class="vue-only">

`form.array` finds the node of the list, and its `push` adds an empty traveler:

```vue{24,48} [booking-form.vue]
<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import { provideFormNode, useForm } from '@formtree/vue'
import { shallowRef } from 'vue'
import { bookingForm, TRIP_TYPE } from './forms/booking'
import SelectField from './select-field.vue'
import TextField from './text-field.vue'

const TRIP_TYPE_OPTIONS = [
  { value: TRIP_TYPE.oneWay, label: 'One way' },
  { value: TRIP_TYPE.roundTrip, label: 'Round trip' },
]

const DESTINATION_OPTIONS = [
  { value: 'denver', label: 'Denver' },
  { value: 'seattle', label: 'Seattle' },
  { value: 'lisbon', label: 'Lisbon' },
  { value: 'tokyo', label: 'Tokyo' },
]

const form = useForm(bookingForm)
provideFormNode(form)
const returnDate = form.field('returnDate')
const travelers = form.array('travelers')
const booking = shallowRef<OutputOf<typeof bookingForm>>()

const bookTrip = form.handleSubmit(trip => {
  booking.value = trip
})
</script>

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

    <button type="button" @click="travelers.push({})">Add traveler</button>

    <button type="submit">Book trip</button>
  </form>
  <pre v-if="booking">{{ booking }}</pre>
</template>
```

`push({})` adds a traveler without any values, because FormTree never invents a value.

</div>

## Rendering Each Traveler

<div class="vue-only">

Each of the `items` of the list gets a fieldset, keyed by the `key` of the item, and its inputs are
named after the `index` of the item:

```vue{17-28}
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
    </fieldset>
    <button type="button" @click="travelers.push({})">Add traveler</button>

    <button type="submit">Book trip</button>
  </form>
  <pre v-if="booking">{{ booking }}</pre>
</template>
```

A name reaches a traveler through its position in the list, such as `travelers.0.fullName` for the
first traveler.

::: info Why the Rows Are Keyed
FormTree keeps the errors and the touched state of a traveler under the key of the row, not under
its position, so they stay with the traveler when the list changes. Keying the fieldsets in the same
way keeps each input with its traveler, while its name follows the current position of the
traveler.
:::

</div>

## Removing a Traveler

<div class="vue-only">

Each traveler gets a button that removes it by passing the index of the traveler to `remove`:

```vue{28-30}
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

    <button type="submit">Book trip</button>
  </form>
  <pre v-if="booking">{{ booking }}</pre>
</template>
```

The travelers after it move up, each keeping its own values and errors.

</div>

## Trying the Booking

<div class="vue-only">

<DemoFrame title="A list of travelers" class="tutorial-demo">
  <BookingForm />
</DemoFrame>

Add three travelers, leave the name of the second one empty and move on, then remove the first. The
error moves up with the traveler it belongs to.

::: code-group

<<< ./steps/rows/booking-form.vue [booking-form.vue]

<<< ./steps/rows/select-field.vue [select-field.vue]

<<< ./steps/rows/text-field.vue [text-field.vue]

<<< ./steps/rows/forms/booking.ts [forms/booking.ts]

:::

</div>
