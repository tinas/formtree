# Node Context

A checkout page owns the form, and each step is a component of its own. The steps need their
part of the form, and their inputs need the step. `provideFormNode` and `useFormNode` pass
nodes down the component tree without props.

## provideFormNode

```vue
<!-- checkout-page.vue -->
<script setup lang="ts">
import { provideFormNode, useForm } from '@formtree/vue'
import { checkoutGroup } from './forms/checkout'

const form = provideFormNode(useForm(checkoutGroup, { deps: { cartId: 'cart_42', countries: ['DE', 'NL'] } }))
</script>
```

`provideFormNode(node)` makes a node available to every descendant and returns it, so it wraps
the call that creates the node. Providing is always explicit: `useForm` never provides by
itself, so a form in a dialog cannot quietly replace the page's form for the components below it.

Any node can be provided: the root, a step, an array item.

## useFormNode

```vue
<!-- delivery-step.vue -->
<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import { checkoutGroup } from './forms/checkout'

const emit = defineEmits<{ next: [] }>()

const delivery = provideFormNode(useFormNode(checkoutGroup).group('delivery'))

const submit = delivery.handleSubmit(() => emit('next'))
</script>
```

`useFormNode(definition)` returns the nearest provided node of that definition, typed by it.
If no ancestor provided one, it throws. It does not fall back to another node.

A component deeper down can then ask for the delivery step by its own definition, without
knowing that it sits inside a checkout:

```ts
const delivery = useFormNode(deliveryGroup)
```

`useFormNode()` without an argument returns the nearest provided node of any definition, with
a loose type. Generic input components use it through `useField(name)`.

## Lists

A row component receives its index, injects the list's parent and provides its own item:

```vue
<!-- line-item-row.vue -->
<script setup lang="ts">
import { provideFormNode, useFormNode } from '@formtree/vue'
import { checkoutGroup } from './forms/checkout'

const props = defineProps<{ index: number }>()

const lineItems = useFormNode(checkoutGroup).array('lineItems')
const row = provideFormNode(lineItems.items[props.index]!)
</script>
```

Inputs inside the row bind to `'sku'` and `'quantity'` by name, relative to the row.

## Why no node props

A node passed through props would make every component in between carry the form's types, and
the props would mirror state the form already holds. With a definition as the key, a component
knows exactly one thing about the form: the definition it renders.

| Component       | Receives                               |
| --------------- | -------------------------------------- |
| A step or card  | nothing; it injects its definition     |
| A generic input | a `name`, relative to the nearest node |
| A row           | an `index`                             |
