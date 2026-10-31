<script setup lang="ts">
import PriceCell from './price-cell.vue'

const PRODUCTS = [
  { id: 1, name: 'Mug', price: 12 },
  { id: 2, name: 'T-shirt', price: 24.9 },
  { id: 3, name: 'Cap', price: 18.5 },
]
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Price</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="product in PRODUCTS" :key="product.id">
        <td>{{ product.name }}</td>
        <td><PriceCell :price="product.price" /></td>
      </tr>
    </tbody>
  </table>
</template>
