# Initial Values and Reset

## Setting Initial Values

A form that edits saved data opens with those values, which it receives through `initialValue`:

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

Any key left out of the initial value starts empty.

## Providing Defaults for Empty Values

A default declared in the schema fills a value that the user left empty, though only in the
submitted output:

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

The input remains empty, while the submit handler receives 30. A value the user should see belongs
in `initialValue` instead.

## Detecting Changes

`state.dirty` is `true` while any value differs from its initial value, so a Save button can stay
disabled until there is something to save:

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

Changing a value back to its initial value makes the form clean again.

::: details How Values Are Compared
Plain objects, arrays, and dates count as the same value when their contents are equal, while any
other object, such as a `File`, counts as the same only when it is the same object.
:::

## Discarding Changes

`reset` discards the changes of the user and returns the form to its initial values:

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

Rows added to or removed from a list are restored as well.
[`ResetOptions`](/api/@formtree/core/interfaces/ResetOptions) lists what a reset can keep.

## Resetting After a Save

Once a save succeeds, passing the stored values to `reset` makes them the new initial values:

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

The form is clean again, and parts left out of the value start empty. The same call also fills a
form whose data loads after the form was created.

A part that is saved on its own, such as a row, is reset in the same way:

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

Only that row becomes clean, and a newly saved row joins the initial value of the list.

## Refreshing Data While Editing

When fresh data arrives while the user is editing, a reset with `keepDirtyValues` takes it in
without discarding the changes of the user:

<div class="vue-only">

```vue{5,12-15}
<script setup lang="ts">
import type { Contact } from './api'

import { useForm } from '@formtree/vue'
import { watch } from 'vue'
import { contactGroup } from './forms/contact'

const props = defineProps<{ contact: Contact }>()

const form = useForm(contactGroup, { initialValue: props.contact })

watch(
  () => props.contact,
  contact => form.reset({ value: contact, keepDirtyValues: true }),
)
</script>
```

</div>

<div class="react-only">

```tsx{4,10-12}
import type { Contact } from './api'

import { useForm } from '@formtree/react'
import { useEffect } from 'react'
import { contactGroup } from './forms/contact'

export function EditContact({ contact }: { contact: Contact }) {
  const form = useForm(contactGroup, { initialValue: contact })

  useEffect(() => {
    form.reset({ value: contact, keepDirtyValues: true })
  }, [form, contact])
}
```

</div>

<div class="javascript-only">

```ts{1,11-16} twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export interface Contact {
  readonly fullName: string
  readonly email: string
}
// @filename: index.ts
// ---cut---
import type { Form } from '@formtree/core'
import type { Contact } from './api'

import { createForm } from '@formtree/core'
import { contactGroup } from './forms/contact'

export function createContactForm(contact: Contact) {
  return createForm(contactGroup, { initialValue: contact })
}

export function showLatestContact(
  form: Form<typeof contactGroup>,
  contact: Contact,
) {
  form.reset({ value: contact, keepDirtyValues: true })
}
```

</div>

Values the user has changed remain as they are, and everything else shows the fresh data. A list
the user has changed keeps all of its rows, and a changed value that now matches the fresh data
becomes clean.

## Warning About Unsaved Changes

The browser asks for confirmation before closing a page whose `beforeunload` event is cancelled, so
cancelling that event while the form is dirty protects unsaved changes:

<div class="vue-only">

```ts
onMounted(() => {
  window.addEventListener('beforeunload', warnAboutUnsavedChanges)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnAboutUnsavedChanges)
})

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
  return () => {
    window.removeEventListener('beforeunload', warnAboutUnsavedChanges)
  }
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
