# Loading Data from the Server

<script setup>
import BookingForm from './steps/server-data/booking-form.vue'
</script>

<div class="vue-only">

The destinations are written into the code twice, once as the select's options and once as the list
the passport rule reads. A travel site loads them from its server, so the booking needs the loaded
list as data from outside the form.

</div>

## Fetching the Destinations

<div class="vue-only">

The site's API sends each destination with whether it is international:

```ts twoslash [api.ts]
// @noStaticSemanticInfo
export interface Destination {
  readonly code: string
  readonly city: string
  readonly international: boolean
}

const LATENCY_MS = 400

const DESTINATIONS: ReadonlyArray<Destination> = [
  { code: 'denver', city: 'Denver', international: false },
  { code: 'seattle', city: 'Seattle', international: false },
  { code: 'lisbon', city: 'Lisbon', international: true },
  { code: 'tokyo', city: 'Tokyo', international: true },
]

export function fetchDestinations(): Promise<ReadonlyArray<Destination>> {
  return new Promise(resolve => {
    setTimeout(() => resolve(DESTINATIONS), LATENCY_MS)
  })
}
```

A timer stands in for the request.

</div>

## Declaring the Destinations

<div class="vue-only">

Data from outside the form is a dependency too. Define the booking with `defineGroupWithDeps` and
the type of the data, and read the destinations from `deps` where the travelers get theirs:

```ts [forms/booking.ts]
const INTERNATIONAL_DESTINATIONS = ['lisbon', 'tokyo'] // [!code --]
interface BookingDeps { // [!code ++]
  readonly destinations: ReadonlyArray<Destination> // [!code ++]
} // [!code ++]

export const bookingForm = defineGroup({ // [!code --]
export const bookingForm = defineGroupWithDeps<BookingDeps>()({ // [!code ++]
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
    travelers: ({ value }) => ({ // [!code --]
      international: INTERNATIONAL_DESTINATIONS.some(code => code == value.destination), // [!code --]
    travelers: ({ value, deps }) => ({ // [!code ++]
      international: deps.destinations.some( // [!code ++]
        destination => destination.code == value.destination && destination.international, // [!code ++]
      ), // [!code ++]
    }),
  },
})
```

`childDeps` receives the booking's own dependencies next to its value, and `Destination` is
imported from the API as a type.

</div>

## Passing the Destinations

<div class="vue-only">

Pass the data with the `deps` option of `useForm`, as a getter over the list the page loads, and
build the select's options from the same list:

```vue [booking-form.vue]
<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import type { Destination } from './api' // [!code ++]
import { provideFormNode, useForm } from '@formtree/vue'
import { shallowRef } from 'vue' // [!code --]
import { computed, ref, shallowRef } from 'vue' // [!code ++]
import { fetchDestinations } from './api' // [!code ++]
import { bookingForm, TRIP_TYPE } from './forms/booking'
import SelectField from './select-field.vue'
import TextField from './text-field.vue'

const TRIP_TYPE_OPTIONS = [
  { value: TRIP_TYPE.oneWay, label: 'One way' },
  { value: TRIP_TYPE.roundTrip, label: 'Round trip' },
]

const DESTINATION_OPTIONS = [ // [!code --]
  { value: 'denver', label: 'Denver' }, // [!code --]
  { value: 'seattle', label: 'Seattle' }, // [!code --]
  { value: 'lisbon', label: 'Lisbon' }, // [!code --]
  { value: 'tokyo', label: 'Tokyo' }, // [!code --]
] // [!code --]
const destinations = ref<ReadonlyArray<Destination>>([]) // [!code ++]
const destinationOptions = computed(() => // [!code ++]
  destinations.value.map(destination => ({ // [!code ++]
    value: destination.code, // [!code ++]
    label: destination.city, // [!code ++]
  })), // [!code ++]
) // [!code ++]

const form = useForm(bookingForm) // [!code --]
const form = useForm(bookingForm, { // [!code ++]
  deps: () => ({ destinations: destinations.value }), // [!code ++]
}) // [!code ++]
provideFormNode(form)
const returnDate = form.field('returnDate')
const travelers = form.array('travelers')
const booking = shallowRef<OutputOf<typeof bookingForm>>()

const bookTrip = form.handleSubmit(trip => {
  booking.value = trip
})

fetchDestinations().then(list => { // [!code ++]
  destinations.value = list // [!code ++]
}) // [!code ++]
</script>

<template>
  <form novalidate @submit.prevent="bookTrip">
    <SelectField name="tripType" label="Trip" :options="TRIP_TYPE_OPTIONS" />
    <!-- [!code --:5] -->
    <SelectField
      name="destination"
      label="Destination"
      :options="DESTINATION_OPTIONS"
    />
    <!-- [!code ++:5] -->
    <SelectField
      name="destination"
      label="Destination"
      :options="destinationOptions"
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

The form reads the getter again when the list arrives, and the passport rule runs with the new
destinations.

::: info Why the Page Loads the Data
The page owns the request, so it decides when to load the list, how long to keep it, and what to
show while it loads. The form reads whatever list it is given, and its rules follow the list as it
changes.
:::

</div>

## Trying the Booking

<div class="vue-only">

<DemoFrame title="Destinations from the server" class="tutorial-demo">
  <BookingForm />
</DemoFrame>

The destinations fill the select a moment after the page opens. Add a traveler and choose Tokyo,
and the passport number now follows the list the server sent.

::: code-group

<<< ./steps/server-data/booking-form.vue [booking-form.vue]

<<< ./steps/server-data/select-field.vue [select-field.vue]

<<< ./steps/server-data/text-field.vue [text-field.vue]

<<< ./steps/server-data/forms/booking.ts [forms/booking.ts]

<<< ./steps/server-data/api.ts [api.ts]

:::

</div>
