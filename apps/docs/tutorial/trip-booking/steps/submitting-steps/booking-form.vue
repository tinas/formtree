<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import type { Destination } from './api'
import { provideFormNode, useForm } from '@formtree/vue'
import { computed, ref, shallowRef } from 'vue'
import { fetchDestinations } from './api'
import { bookingForm, TRIP_TYPE } from './forms/booking'
import SelectField from './select-field.vue'
import TextField from './text-field.vue'

const STEP = {
  destination: 'destination',
  dates: 'dates',
  travelers: 'travelers',
} as const

type Step = (typeof STEP)[keyof typeof STEP]

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
const returnDate = form.field('dates.returnDate')
const travelers = form.array('travelers')
const step = ref<Step>(STEP.destination)
const booking = shallowRef<OutputOf<typeof bookingForm>>()

const submitDestination = form.field('destination').handleSubmit(() => {
  step.value = STEP.dates
})

const submitDates = form.group('dates').handleSubmit(() => {
  step.value = STEP.travelers
})

const bookTrip = form.handleSubmit(trip => {
  booking.value = trip
})

fetchDestinations().then(list => {
  destinations.value = list
})
</script>

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
