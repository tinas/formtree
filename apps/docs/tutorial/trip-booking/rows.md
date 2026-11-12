# Adding and Removing Rows

<script setup>
import BookingForm from './steps/rows/booking-form.vue'
</script>

<div class="vue-only">

The booking says where the trip goes but not who travels. Every traveler needs a name and a date of
birth, and one booking may hold a single traveler or a whole family, so the form needs a part that
repeats.

</div>

## Defining a Traveler

<div class="vue-only">

Define one traveler as a group, and wrap it in `arrayOf` to keep a list of them:

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

Get the list's node with `form.array`, and add an empty traveler with its `push`:

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

`push({})` adds a traveler with no values yet, because formtree fills in nothing for you.

</div>

## Rendering Each Traveler

<div class="vue-only">

Render a fieldset for each of the list's `items`, keyed by the item's `key`, and name its inputs
after the item's `index`:

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

A name reaches a traveler through its place in the list, such as `travelers.0.fullName` for the
first one.

::: info Why the Rows Are Keyed
formtree keeps a traveler's errors and touched state under the row's key, not its position, so they
stay with the traveler when the list changes. Keying the fieldsets the same way keeps each input with
its traveler, while its name follows the traveler's current position.
:::

</div>

## Removing a Traveler

<div class="vue-only">

Give each traveler a button that removes it with `remove` and the traveler's index:

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

The travelers after it move up, each with its own values and errors.

</div>

## Trying the Booking

<div class="vue-only">

<DemoFrame title="A list of travelers" class="tutorial-demo">
  <BookingForm />
</DemoFrame>

Add three travelers, leave the second one's name empty and move on, then remove the first. The
error moves up with the traveler it belongs to.

::: code-group

<<< ./steps/rows/booking-form.vue [booking-form.vue]

<<< ./steps/rows/select-field.vue [select-field.vue]

<<< ./steps/rows/text-field.vue [text-field.vue]

<<< ./steps/rows/forms/booking.ts [forms/booking.ts]

:::

</div>
