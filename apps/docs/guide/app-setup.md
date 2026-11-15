# App Setup

## Setting Defaults

<div class="vue-only">

The options that every form shares are passed to `createFormtree` when the plugin is installed:

```ts [main.ts]
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App)
  .use(createFormtree({ mode: 'onSubmit' }))
  .mount('#app')
```

</div>

<div class="react-only">

The options that every form shares are passed to `<FormtreeProvider>` at the root of the app:

```tsx [app.tsx]
import { FormtreeProvider } from '@formtree/react'
import { ContactForm } from './contact-form'

export function App() {
  return (
    <FormtreeProvider mode="onSubmit">
      <ContactForm />
    </FormtreeProvider>
  )
}
```

</div>

<div class="javascript-only">

The options that every form shares are kept in one object, which is passed to each `createForm`:

::: code-group

```ts twoslash [form-defaults.ts]
// @noStaticSemanticInfo
import type { FormDefaults } from '@formtree/core'

export const formDefaults: FormDefaults = {
  mode: 'onSubmit',
}
```

```ts twoslash [contact-form.ts]
// @noStaticSemanticInfo
// @filename: form-defaults.ts
import type { FormDefaults } from '@formtree/core'

export const formDefaults: FormDefaults = { mode: 'onSubmit' }
// @filename: contact-form.ts
// ---cut---
import { createForm } from '@formtree/core'
import { formDefaults } from './form-defaults'
import { contactForm } from './forms/contact-form'

const form = createForm(contactForm, formDefaults)
```

:::

</div>

Every form starts from these options. [Showing Errors](/guide/showing-errors) and
[Submitting](/guide/submitting) explain what each one does, and `formatError` set here translates
the errors of every form, as [Translating Errors](/guide/showing-errors#translating-errors) shows.

## Overriding a Default

An option given to a single form takes precedence over the default of the app:

<div class="vue-only">

```vue
<script setup lang="ts">
import { useForm } from '@formtree/vue'
import { contactForm } from './forms/contact-form'

const form = useForm(contactForm, { mode: 'onTouched' })
</script>
```

</div>

<div class="react-only">

```tsx
import { useForm } from '@formtree/react'
import { contactForm } from './forms/contact-form'

export function ContactForm() {
  const form = useForm(contactForm, { mode: 'onTouched' })
}
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: form-defaults.ts
import type { FormDefaults } from '@formtree/core'

export const formDefaults: FormDefaults = { mode: 'onSubmit' }
// @filename: contact-form.ts
// ---cut---
import { createForm } from '@formtree/core'
import { formDefaults } from './form-defaults'
import { contactForm } from './forms/contact-form'

const form = createForm(contactForm, { ...formDefaults, mode: 'onTouched' })
```

</div>

A `mode` set in a definition takes precedence over both.

## Inspecting Forms in Devtools

<div class="vue-only">

Once the plugin is installed with `createFormtree`, every form created with `useForm` appears in
[Vue Devtools](https://devtools.vuejs.org) during development:

![The FormTree inspector in Vue Devtools, showing a checkout form as a tree of nodes](/devtools-inspector.png)

Tags show the kind and the state of each node, with errors counted as shown or hidden, and hovering
a tag explains it. The inspector only reads, so every value and error still comes from the app.

### Following Changes {#vue-only-following-changes}

The Timeline tab records every change, check, and submit while its record button is on:

![The FormTree timeline in Vue Devtools, showing a submit, an asynchronous check and a change](/devtools-timeline.png)

Selecting an event shows its path and the value at that path at that moment.

### Turning Off the Devtools {#vue-only-turning-off-the-devtools}

Passing `devtools: false` keeps the forms out of Vue Devtools during development:

```ts [main.ts]
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App)
  .use(createFormtree({ devtools: false }))
  .mount('#app')
```

Production builds leave the devtools out without this option.

</div>

<div class="react-only">

The devtools come with the Vue adapter, because React DevTools offers no way for a library to add a
panel of its own.

</div>

<div class="javascript-only">

The devtools come with the Vue adapter and show forms in Vue Devtools, so a form built with the core
alone does not appear in them.

</div>
