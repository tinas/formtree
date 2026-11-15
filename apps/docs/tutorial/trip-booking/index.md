# Making a Field Conditional

<script setup>
import BookingForm from './steps/field-on-and-off/booking-form.vue'
</script>

<div class="vue-only">

This tutorial builds a trip booking one chapter at a time. By the end, the booking asks for the
destination, the dates, and the travelers in three steps, and the Continue button of each step
validates only that step. Along the way, the booking learns to follow the answers of the traveler,
from a return date that only a round trip needs to a passport number for everyone on a trip abroad.

::: tip Prerequisites
The tutorial assumes basic familiarity with Vue and TypeScript. To follow along, install
`@formtree/vue`, and `zod` for the schemas.
:::

</div>

## Starting the Booking

<div class="vue-only">

The booking starts with the trip itself, defined as a group:

```ts twoslash [forms/booking.ts]
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

export const bookingForm = defineGroup({
  schema: z.object({
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }),
    destination: z.string({ error: 'Choose a destination' }),
    departureDate: z.iso.date({ error: 'Choose a departure date' }),
    returnDate: z.iso.date({ error: 'Choose a return date' }),
  }),
})
```

Its inputs are two small components, a text input that passes a `type` on for the dates, and a
select. Each of them binds the field that its `name` points to with `useField`, which finds the
field in the form that a component above provides:

::: code-group

<<< ./steps/field-on-and-off/text-field.vue [text-field.vue]

<<< ./steps/field-on-and-off/select-field.vue [select-field.vue]

:::

The component of the booking creates the form, provides it to the inputs, and keeps the booking it
submits, so the page can show it:

```vue [booking-form.vue]
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
    <TextField name="returnDate" label="Return" type="date" />

    <button type="submit">Book trip</button>
  </form>
  <pre v-if="booking">{{ booking }}</pre>
</template>
```

A one-way trip has no return date, yet the schema requires one on every booking, so a one-way trip
cannot be booked. Making the date optional would not help either, because a round trip could then be
booked without one.

</div>

## Giving the Return Date a Definition

<div class="vue-only">

A group can activate and deactivate its children, but not the keys of its schema. The return date
therefore moves out of the schema into a child with a definition of its own:

```ts [forms/booking.ts]
import { defineGroup } from '@formtree/vue' // [!code --]
import { defineField, defineGroup } from '@formtree/vue' // [!code ++]
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

const returnDateField = defineField({ // [!code ++]
  schema: z.iso.date({ error: 'Choose a return date' }), // [!code ++]
}) // [!code ++]

export const bookingForm = defineGroup({
  schema: z.object({
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }),
    destination: z.string({ error: 'Choose a destination' }),
    departureDate: z.iso.date({ error: 'Choose a departure date' }),
    returnDate: z.iso.date({ error: 'Choose a return date' }), // [!code --]
  }),
  children: { returnDate: returnDateField }, // [!code ++]
})
```

The value of the booking keeps its shape, and the return date is now a child that a condition can
deactivate.

::: info Why the Date Leaves the Schema
A key of the schema takes its rules from the schema of the group, which validates every key in one
run. A
child brings its own definition, so the group can leave it out of validation and out of the
submitted value.
:::

</div>

## Activating the Date for Round Trips

<div class="vue-only">

The `activeWhen` option of the group states when the child applies:

```ts{20-22} [forms/booking.ts]
import { defineField, defineGroup } from '@formtree/vue'
import { z } from 'zod'

export const TRIP_TYPE = {
  oneWay: 'oneWay',
  roundTrip: 'roundTrip',
} as const

const returnDateField = defineField({
  schema: z.iso.date({ error: 'Choose a return date' }),
})

export const bookingForm = defineGroup({
  schema: z.object({
    tripType: z.enum(TRIP_TYPE, { error: 'Choose a trip type' }),
    destination: z.string({ error: 'Choose a destination' }),
    departureDate: z.iso.date({ error: 'Choose a departure date' }),
  }),
  children: { returnDate: returnDateField },
  activeWhen: {
    returnDate: ({ value }) => value.tripType == TRIP_TYPE.roundTrip,
  },
})
```

An inactive child is not validated and is left out of the submitted booking, so a one-way trip can
be booked without a return date.

</div>

## Showing the Date Only for Round Trips

<div class="vue-only">

`state.active` tells the page whether the child applies, so the input of the return date is
rendered only while it does:

```vue [booking-form.vue]
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
const returnDate = form.field('returnDate') // [!code ++]
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
    <TextField name="returnDate" label="Return" type="date" /> <!-- [!code --] -->
    <!-- [!code ++:6] -->
    <TextField
      v-if="returnDate.state.active"
      name="returnDate"
      label="Return"
      type="date"
    />

    <button type="submit">Book trip</button>
  </form>
  <pre v-if="booking">{{ booking }}</pre>
</template>
```

On a one-way trip the input leaves the page, and on a round trip it returns with the date it held
before.

::: info Why the Page Asks the Form
The condition lives in the definition, where it also determines what is validated and submitted.
Reading `state.active` keeps the input in step with it, so the template never repeats the rule.
:::

</div>

## Trying the Booking

<div class="vue-only">

<DemoFrame title="A return date for round trips only" class="tutorial-demo">
  <BookingForm />
</DemoFrame>

Choose a round trip and a return date, then switch to one way and book. The date is left out of the
booking, and switching back shows it as it was.

::: code-group

<<< ./steps/field-on-and-off/booking-form.vue [booking-form.vue]

<<< ./steps/field-on-and-off/select-field.vue [select-field.vue]

<<< ./steps/field-on-and-off/text-field.vue [text-field.vue]

<<< ./steps/field-on-and-off/forms/booking.ts [forms/booking.ts]

:::

</div>
