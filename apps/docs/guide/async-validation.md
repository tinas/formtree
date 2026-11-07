# Async Validation

## Checking with the Server

A rule only the server can answer, such as whether a username is still free, goes in
`validateAsync` of the value's definition:

```ts twoslash
// @filename: api.ts
export declare function isUsernameAvailable(username: string): Promise<boolean>
// @filename: sign-up.ts
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, { error: 'Use at least 3 characters' }),
  validateAsync: {
    run: async username => ((await isUsernameAvailable(username)) ? undefined : { code: 'This username is taken' }),
  },
})

export const signUpForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: { username: usernameField },
})
```

`run` receives the value the schema outputs and returns an error or `undefined`, as a rule does.

::: tip Checks on Groups
A group can have a check too, which receives the group's output.
:::

## Changing the Trigger

To check the value when the user leaves the input instead of after each change, set `on` to
`'blur'`:

```ts{4} twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isUsernameAvailable(username: string): Promise<boolean>
// @filename: sign-up.ts
import { defineField } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, { error: 'Use at least 3 characters' }),
  validateAsync: {
    on: 'blur',
    run: async username => ((await isUsernameAvailable(username)) ? undefined : { code: 'This username is taken' }),
  },
})
```

[`AsyncValidationOptions`](/api/@formtree/core/interfaces/AsyncValidationOptions) lists every
trigger and the pause a check waits after it.

## Showing a Pending Check

`state.validating` is `true` while a check waits or runs, so the input can show a hint:

<div class="vue-only">

```vue{12}
<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { signUpForm } from './forms/sign-up'

const form = useForm(signUpForm)
const username = useField(form.field('username'))
</script>

<template>
  <label :for="username.id">Username</label>
  <input v-model="username.model" v-bind="username.attrs" />
  <p v-if="username.state.validating">Checking the username…</p>
  <p :id="username.errorId">{{ username.errorMessage }}</p>
</template>
```

</div>

<div class="react-only">

```tsx{12}
import { useField, useForm } from '@formtree/react'
import { signUpForm } from './forms/sign-up'

export function SignUpForm() {
  const form = useForm(signUpForm)
  const username = useField(form.field('username'))

  return (
    <>
      <label htmlFor={username.id}>Username</label>
      <input {...username.attrs} value={username.value ?? ''} onChange={event => username.setValue(event.target.value)} />
      {username.state.validating && <p>Checking the username…</p>}
      <p id={username.errorId}>{username.errorMessage}</p>
    </>
  )
}
```

</div>

<div class="javascript-only">

```ts twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isUsernameAvailable(username: string): Promise<boolean>
// @filename: sign-up.ts
import { createForm, defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'

const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, { error: 'Use at least 3 characters' }),
  validateAsync: {
    run: async username => ((await isUsernameAvailable(username)) ? undefined : { code: 'This username is taken' }),
  },
})
const signUpForm = defineGroup({
  schema: z.object({ email: z.email({ error: 'Enter a valid email address' }) }),
  children: { username: usernameField },
})
const form = createForm(signUpForm)
// ---cut---
const username = form.field('username')
const checking = document.querySelector<HTMLParagraphElement>('#username-checking')!

form.subscribe(() => {
  checking.hidden = !username.state.validating
})
```

</div>

## Cancelling Stale Requests

Pass the `signal` that `run` receives on to the request, so a request for a value that has changed
since is cancelled:

```ts{4-5} twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isUsernameAvailable(username: string, signal: AbortSignal): Promise<boolean>
// @filename: sign-up.ts
import { defineField } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, { error: 'Use at least 3 characters' }),
  validateAsync: {
    run: async (username, { signal }) =>
      (await isUsernameAvailable(username, signal)) ? undefined : { code: 'This username is taken' },
  },
})
```

formtree also ignores an answer for an older value, so the result always belongs to the value on the
screen.

## Waiting for Other Rules

A check waits while its value has a schema or rule error, including one that a parent's rule puts
there:

```ts twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isPromoCodeValid(code: string, signal: AbortSignal): Promise<boolean>
// @filename: payment.ts
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { isPromoCodeValid } from './api'

const promoCodeField = defineField({
  schema: z.string().trim().toUpperCase().optional(),
  validateAsync: {
    run: async (code, { signal }) =>
      code === undefined || code === '' || (await isPromoCodeValid(code, signal))
        ? undefined
        : { code: 'This code is not valid' },
  },
})
// ---cut---
export const paymentGroup = defineGroup({
  schema: z.object({
    method: z.enum(['card', 'invoice'], { error: 'Choose a payment method' }),
  }),
  children: { promoCode: promoCodeField },
  validate: ({ value }) =>
    value.method === 'invoice' && value.promoCode
      ? { path: 'promoCode', code: 'Promo codes apply to card payments only' }
      : undefined,
})
```

While invoice is selected, the promo code has the rule's error, so its server check does not run.

## Submitting During a Check

`handleSubmit` waits for running checks and starts any that have not run yet, so the handler
receives only a value the server has confirmed:

```ts twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isUsernameAvailable(username: string, signal: AbortSignal): Promise<boolean>
export declare function createAccount(account: { email: string; username: string }): Promise<void>
// @filename: sign-up.ts
import { createForm, defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { createAccount, isUsernameAvailable } from './api'

const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, { error: 'Use at least 3 characters' }),
  validateAsync: {
    run: async (username, { signal }) =>
      (await isUsernameAvailable(username, signal)) ? undefined : { code: 'This username is taken' },
  },
})
const signUpForm = defineGroup({
  schema: z.object({ email: z.email({ error: 'Enter a valid email address' }) }),
  children: { username: usernameField },
})
const form = createForm(signUpForm)
// ---cut---
const signUp = form.handleSubmit(async account => {
  await createAccount(account)
})
```

## Handling Failed Requests

A check whose `run` throws becomes an error with the code
[`ASYNC_FAILED_CODE`](/api/@formtree/core/variables/ASYNC_FAILED_CODE), so a value the server could
not check never passes:

```ts twoslash
// @noStaticSemanticInfo
import { defineField } from '@formtree/core'
import { z } from 'zod'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, { error: 'Use at least 3 characters' }),
  validateAsync: {
    run: async (username, { signal }) => {
      const response = await fetch(`/api/usernames/${encodeURIComponent(username)}`, { signal })
      if (!response.ok) {
        throw new Error(`The username check failed with status ${response.status}`)
      }
      const { available } = (await response.json()) as { available: boolean }
      return available ? undefined : { code: 'This username is taken' }
    },
  },
})
```

::: warning Error Statuses
`fetch` rejects only when the network fails, so `run` throws for an error status itself.
:::
