# Initial Values and Reset

## Setting Initial Values

To open a form with saved values, pass them as `initialValue`:

<div class="vue-only">

```vue
<script setup lang="ts">
import type { Contact } from './api'

import { useForm } from '@formtree/vue'
import { contactGroup } from './forms/contact'

const props = defineProps<{ contact: Contact }>()

const form = useForm(contactGroup, { initialValue: props.contact })
</script>
```

</div>

<div class="react-only">

```tsx
import type { Contact } from './api'

import { useForm } from '@formtree/react'
import { contactGroup } from './forms/contact'

export function EditContact({ contact }: { contact: Contact }) {
  const form = useForm(contactGroup, { initialValue: contact })
}
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export interface Contact {
  readonly fullName: string
  readonly email: string
}
// @filename: index.ts
// ---cut---
import type { Contact } from './api'

import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

export function createContactForm(contact: Contact) {
  return createForm(contactGroup, { initialValue: contact })
}
```

</div>

Keys you leave out start empty.

## Defaulting Empty Values

A schema default fills a value the user left empty, in the submitted output only:

```ts twoslash
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export const invoiceGroup = defineGroup({
  schema: z.object({
    company: z.string({ error: 'Company name is required' }),
    dueInDays: z.number().int().positive().default(30),
  }),
})
```

The input stays empty, and the submit handler receives 30. When the user should see the value, use
`initialValue` instead.

## Detecting Changes

`state.dirty` is true while a value differs from its initial value. Use it to enable a Save button:

<div class="vue-only">

```vue
<button type="submit" :disabled="!form.state.dirty">Save</button>
```

</div>

<div class="react-only">

```tsx
const dirty = useNodeState(form, node => node.state.dirty)

return (
  <button type="submit" disabled={!dirty}>
    Save
  </button>
)
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

const form = createForm(contactGroup)
// ---cut---
const saveButton = document.querySelector<HTMLButtonElement>('#save')!

updateSaveButton()
form.subscribe(updateSaveButton)

function updateSaveButton() {
  saveButton.disabled = !form.state.dirty
}
```

</div>

Changing a value back makes the form clean again.

## Discarding Changes

`reset` returns the form to its initial values:

<div class="vue-only">

```vue
<button type="button" @click="form.reset()">Discard changes</button>
```

</div>

<div class="react-only">

```tsx
<button type="button" onClick={() => form.reset()}>
  Discard changes
</button>
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

const form = createForm(contactGroup)
// ---cut---
const discardButton = document.querySelector<HTMLButtonElement>('#discard')!

discardButton.addEventListener('click', () => form.reset())
```

</div>

Rows added to or removed from a list are undone too.
[`ResetOptions`](/api/@formtree/core/interfaces/ResetOptions) lists what a reset can keep.

## Resetting After a Save

After a save, pass the stored values to `reset` to make them the new initial values:

```ts twoslash
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

interface Contact {
  readonly fullName: string
  readonly email: string
}

declare function saveContact(contact: Contact): Promise<Contact>

const form = createForm(contactGroup)
// ---cut---
const save = form.handleSubmit(async contact => {
  form.reset({ value: await saveContact(contact) })
})
```

The form is clean again.

::: tip Data That Loads Later
The same call fills a form whose data loads after it was created.
:::

A part that saves on its own, such as a row, resets the same way:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { saveLineItem } from './forms/api'
import { lineItemsArray } from './forms/line-items'

const cartForm = defineGroup({ children: { lineItems: lineItemsArray } })
const form = createForm(cartForm)
const lineItems = form.array('lineItems')
lineItems.push({ sku: 'MUG-01', quantity: 1 })
const row = lineItems.items[0]!
// ---cut---
const saveRow = row.handleSubmit(async lineItem => {
  row.reset({ value: await saveLineItem(lineItem) })
})
```

Only that row becomes clean, and a saved new row joins the list's initial value.

## Warning Before Leaving

To warn before the page closes with unsaved changes, cancel `beforeunload` while the form is dirty:

<div class="vue-only">

```ts
onMounted(() => window.addEventListener('beforeunload', warnAboutUnsavedChanges))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnAboutUnsavedChanges))

function warnAboutUnsavedChanges(event: BeforeUnloadEvent) {
  if (form.state.dirty) {
    event.preventDefault()
  }
}
```

</div>

<div class="react-only">

```tsx
useEffect(() => {
  function warnAboutUnsavedChanges(event: BeforeUnloadEvent) {
    if (form.state.dirty) {
      event.preventDefault()
    }
  }
  window.addEventListener('beforeunload', warnAboutUnsavedChanges)
  return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges)
}, [form])
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

const form = createForm(contactGroup)
// ---cut---
window.addEventListener('beforeunload', event => {
  if (form.state.dirty) {
    event.preventDefault()
  }
})
```

</div>
