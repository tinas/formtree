<script setup lang="ts">
import type { OutputOf } from '@formtree/vue'
import type { Destination } from './api'
import { provideFormNode, useForm } from '@formtree/vue'
import { computed, ref, shallowRef } from 'vue'
import { fetchDestinations } from './api'
import { bookingForm, TRIP_TYPE } from './forms/booking'
import SelectField from './select-field.vue'
import TextField from './text-field.vue'

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
const returnDate = form.field('returnDate')
const travelers = form.array('travelers')
const booking = shallowRef<OutputOf<typeof bookingForm>>()

const bookTrip = form.handleSubmit(trip => {
  booking.value = trip
})

fetchDestinations().then(list => {
  destinations.value = list
})
</script>

<template>
  <form novalidate @submit.prevent="bookTrip">
    <SelectField name="tripType" label="Trip" :options="TRIP_TYPE_OPTIONS" />
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
