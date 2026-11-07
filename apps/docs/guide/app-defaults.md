# App Defaults

## Setting Defaults

<div class="vue-only">

Pass the options every form shares to `createFormtree` when you install it:

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

Pass the options every form shares to `<FormtreeProvider>` at the root of the app:

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

Keep the options every form shares in one object, and pass it to each `createForm`:

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
[Submitting](/guide/submitting) explain what each one does.

## Translating Errors

Add `formatError` to the defaults, and every form shows its errors in the user's language:

<div class="vue-only">

```ts{3,5,7,10,14} [main.ts]
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { messages } from './messages'

const i18n = createI18n({ legacy: false, locale: 'en', messages })

createApp(App)
  .use(i18n)
  .use(
    createFormtree({
      mode: 'onSubmit',
      formatError: error => i18n.global.t(error.code, { ...error.params }),
    }),
  )
  .mount('#app')
```

</div>

<div class="react-only">

```tsx{1,3,8,14-16} [app.tsx]
import type { FormError } from '@formtree/react'
import { FormtreeProvider } from '@formtree/react'
import i18next from 'i18next'
import { ContactForm } from './contact-form'

export function App() {
  return (
    <FormtreeProvider mode="onSubmit" formatError={formatError}>
      <ContactForm />
    </FormtreeProvider>
  )
}

function formatError(error: FormError) {
  return i18next.t(error.code, { ...error.params })
}
```

</div>

<div class="javascript-only">

```ts{2,6} twoslash [form-defaults.ts]
// @noStaticSemanticInfo
// @filename: i18next.d.ts
declare module 'i18next' {
  const i18next: { t: (key: string, options?: Record<string, unknown>) => string }
  export default i18next
}
// @filename: form-defaults.ts
// ---cut---
import type { FormDefaults } from '@formtree/core'
import i18next from 'i18next'

export const formDefaults: FormDefaults = {
  mode: 'onSubmit',
  formatError: error => i18next.t(error.code, { ...error.params }),
}
```

</div>

[Binding Inputs](/guide/binding-inputs) shows how errors on screen follow a language switch.

## Overriding a Default

An option given to one form wins over the app's default:

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

::: tip Definitions Win
A `mode` set in a definition wins over both.
:::
