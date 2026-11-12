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
