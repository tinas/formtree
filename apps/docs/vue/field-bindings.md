# Field Bindings

`useField` turns a field node into what an input needs: a value for `v-model` and the attributes
for the element.

## A generic input

```vue
<!-- text-field.vue -->
<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<string>(() => props.name)
</script>

<template>
  <div class="field">
    <label :for="field.id">{{ label }}</label>
    <input v-model="field.model" v-bind="field.attrs" />
    <p :id="field.errorId">{{ field.state.errors[0]?.code }}</p>
  </div>
</template>
```

`useField(name)` finds the field at `name`, relative to the nearest provided node. A step
renders `<TextField name="address.city" label="City" />`, and the component never sees the
form's types.

| Member                           | Description                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `model`                          | Read and write the value. `v-model="field.model"`.                                     |
| `attrs`                          | `id`, `name`, `aria-invalid`, `aria-describedby` and `onBlur`. `v-bind="field.attrs"`. |
| `state`                          | The field's reactive state.                                                            |
| `id`, `errorId`, `descriptionId` | Ids for the label, the error message and the description.                              |
| `node`                           | The field node itself.                                                                 |

The name can be a ref or a getter. When it changes, the binding follows the new field.

## Typed bindings

A business component that knows its definition can bind a typed node instead of a name:

```ts
const delivery = injectFormNode(deliveryGroup)

const method = useField(delivery.field('method'))
// method.model: 'shipping' | 'pickup' | undefined
```

The model is typed from the definition, and assigning a value the schema does not accept is a
type error.

## Values that are not strings

An `<input>` produces strings, and a draft holds `undefined` while empty. A number input
converts between the two:

```vue
<!-- number-field.vue -->
<script setup lang="ts">
import { useField } from '@formtree/vue'
import { computed } from 'vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<number>(() => props.name)

const text = computed({
  get: () => (field.model === undefined ? '' : String(field.model)),
  set: value => {
    field.model = value === '' ? undefined : Number(value)
  },
})
</script>

<template>
  <div class="field">
    <label :for="field.id">{{ label }}</label>
    <input v-model="text" v-bind="field.attrs" type="number" />
    <p :id="field.errorId">{{ field.state.errors[0]?.code }}</p>
  </div>
</template>
```

Clearing the input writes `undefined`, so the schema reports a missing value instead of `0`.
