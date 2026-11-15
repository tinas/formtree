# Async Validation

A check asks the server about a value, and FormTree handles its timing, cancellation, and failures.

## Checking with the Server

Some rules can only be answered by the server, such as the availability of a username. A rule of
this kind belongs in `validateAsync`, in the definition of the value it checks, so that value is a
child rather than a key, as [Groups](/guide/groups#choosing-between-a-key-and-a-child) explains:

```ts twoslash
// @filename: api.ts
export declare function isUsernameAvailable(username: string): Promise<boolean>
// @filename: sign-up.ts
import { defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, {
    error: 'Use at least 3 characters',
  }),
  validateAsync: {
    run: async username => {
      const available = await isUsernameAvailable(username)
      return available ? undefined : { code: 'This username is taken' }
    },
  },
})

export const signUpForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
  }),
  children: { username: usernameField },
})
```

`run` receives the value that the schema outputs and returns an error or `undefined`, in the same
way as a rule. A group can declare a check as well, which then receives the output of the group.

## Waiting Until Typing Stops

A check waits after each change and runs once the user stops typing, so a username typed in one go
costs one request instead of one per character. `debounceMs` sets how long it waits:

```ts{6} twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isUsernameAvailable(username: string): Promise<boolean>
// @filename: sign-up.ts
import { defineField } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, {
    error: 'Use at least 3 characters',
  }),
  validateAsync: {
    debounceMs: 500,
    run: async username => {
      const available = await isUsernameAvailable(username)
      return available ? undefined : { code: 'This username is taken' }
    },
  },
})
```

Each change starts the wait again, so the check runs only for the value the user stopped at. A slow
or costly request can wait longer, and
[`AsyncValidationOptions`](/api/@formtree/core/interfaces/AsyncValidationOptions) lists how long a
check waits without `debounceMs`.

## Changing the Trigger

With `on: 'blur'`, a check waits until the user leaves the input instead of running after each
change:

```ts{6} twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isUsernameAvailable(username: string): Promise<boolean>
// @filename: sign-up.ts
import { defineField } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, {
    error: 'Use at least 3 characters',
  }),
  validateAsync: {
    on: 'blur',
    run: async username => {
      const available = await isUsernameAvailable(username)
      return available ? undefined : { code: 'This username is taken' }
    },
  },
})
```

Every trigger is listed in
[`AsyncValidationOptions`](/api/@formtree/core/interfaces/AsyncValidationOptions).

## Showing a Pending Check

While a check is running, `state.requesting` is `true`, which lets the input show a hint:

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
  <p v-if="username.state.requesting">Checking the username…</p>
  <p :id="username.errorId">{{ username.errorMessage }}</p>
</template>
```

</div>

<div class="react-only">

```tsx{16}
import { useField, useForm } from '@formtree/react'
import { signUpForm } from './forms/sign-up'

export function SignUpForm() {
  const form = useForm(signUpForm)
  const username = useField(form.field('username'))

  return (
    <>
      <label htmlFor={username.id}>Username</label>
      <input
        {...username.attrs}
        value={username.value ?? ''}
        onChange={event => username.setValue(event.target.value)}
      />
      {username.state.requesting && <p>Checking the username…</p>}
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
const checking = document.getElementById('username-checking')!

username.subscribe(() => {
  checking.hidden = !username.state.requesting
})
```

</div>

`state.validating` is also `true` while a check waits after its trigger, so a mark confirming that a
value is available should wait until `validating` is `false`.

## Skipping the Saved Value

On an edit form, the value already saved with the record needs no check. Passing the saved value
down as deps lets `run` return early for it:

```ts twoslash
// @filename: api.ts
export declare function isUsernameAvailable(username: string): Promise<boolean>
// @filename: account.ts
import { defineFieldWithDeps, defineGroupWithDeps } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
interface AccountDeps {
  savedUsername?: string
}

const usernameField = defineFieldWithDeps<AccountDeps>()({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, {
    error: 'Use at least 3 characters',
  }),
  validateAsync: {
    run: async (username, { deps }) => {
      if (username == deps.savedUsername) {
        return undefined
      }
      const available = await isUsernameAvailable(username)
      return available ? undefined : { code: 'This username is taken' }
    },
  },
})

export const accountForm = defineGroupWithDeps<AccountDeps>()({
  children: { username: usernameField },
  childDeps: {
    username: ({ deps }) => ({ savedUsername: deps.savedUsername }),
  },
})
```

The deps are set when the account loads and after each save, as
[Groups](/guide/groups#providing-the-data) shows. A check also runs when its deps change, finds the
saved value, and returns without a request, so no hint flashes.

## Cancelling Stale Requests

A request for a value that has changed in the meantime is no longer needed. Passing the `signal`
that `run` receives on to the request cancels it:

```ts{6-8} twoslash
// @noStaticSemanticInfo
// @filename: api.ts
export declare function isUsernameAvailable(username: string, signal: AbortSignal): Promise<boolean>
// @filename: sign-up.ts
import { defineField } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, {
    error: 'Use at least 3 characters',
  }),
  validateAsync: {
    run: async (username, { signal }) => {
      const available = await isUsernameAvailable(username, signal)
      return available ? undefined : { code: 'This username is taken' }
    },
  },
})
```

FormTree also ignores any answer for an older value, so the result always corresponds to the value
on the screen.

## Waiting for Other Rules

A check is held back while its value has a schema or rule error, including an error that a rule of
a parent places on it:

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
      code == undefined || code == '' || (await isPromoCodeValid(code, signal))
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
    value.method == 'invoice' && value.promoCode
      ? { path: 'promoCode', code: 'Promo codes apply to card payments only' }
      : undefined,
})
```

While invoice is selected, the promo code carries the error of that rule, so its server check does
not run.

## Submitting During a Check

`handleSubmit` asks every check again and waits for any check that is already running, so the
handler receives only a value the server has just confirmed:

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

`validate()` asks every check again in the same way, while schemas and rules run again only when
their value changes.

::: tip Fewer Requests
A check sends a request every time it runs, even for a value it has checked before. Caching the
request inside `run` answers a repeated value without a new request.
:::

## Handling Failed Requests

When the request fails, `run` should throw. The check then fails, so a value the server could not
check never passes:

```ts twoslash
// @noStaticSemanticInfo
import { defineField } from '@formtree/core'
import { z } from 'zod'
// ---cut---
const usernameField = defineField({
  schema: z.string({ error: 'Choose a username' }).trim().min(3, {
    error: 'Use at least 3 characters',
  }),
  validateAsync: {
    run: async (username, { signal }) => {
      const url = `/api/usernames/${encodeURIComponent(username)}`
      const response = await fetch(url, { signal })
      if (!response.ok) {
        throw new Error(`The username check failed (${response.status})`)
      }
      const { available } = (await response.json()) as { available: boolean }
      return available ? undefined : { code: 'This username is taken' }
    },
  },
})
```

A failed check runs again on its next trigger, even for the same value. A submit whose check fails
once more resolves to `'unchecked'` and focuses the field of that check.

::: warning Error Statuses
`fetch` rejects only when the network fails, so `run` has to throw for an error status itself.
:::

## Retrying a Failed Check

A failed check can be shown together with a button that tries again. `state.failedChecks` tells the
page that a check has failed, and `validate()` on the node of the field runs it again:

<div class="vue-only">

```vue{12-15}
<script setup lang="ts">
import { useField, useForm } from '@formtree/vue'
import { signUpForm } from './forms/sign-up'

const form = useForm(signUpForm)
const username = useField(form.field('username'))
</script>

<template>
  <label :for="username.id">Username</label>
  <input v-model="username.model" v-bind="username.attrs" />
  <p v-if="username.state.failedChecks.length > 0">
    We couldn't check the username.
    <button type="button" @click="username.node.validate()">Try again</button>
  </p>
  <p :id="username.errorId">{{ username.errorMessage }}</p>
</template>
```

</div>

<div class="react-only">

```tsx{16-23}
import { useField, useForm } from '@formtree/react'
import { signUpForm } from './forms/sign-up'

export function SignUpForm() {
  const form = useForm(signUpForm)
  const username = useField(form.field('username'))

  return (
    <>
      <label htmlFor={username.id}>Username</label>
      <input
        {...username.attrs}
        value={username.value ?? ''}
        onChange={event => username.setValue(event.target.value)}
      />
      {username.state.failedChecks.length > 0 && (
        <p>
          We couldn't check the username.
          <button type="button" onClick={() => void username.node.validate()}>
            Try again
          </button>
        </p>
      )}
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
export declare function isUsernameAvailable(username: string, signal: AbortSignal): Promise<boolean>
// @filename: sign-up.ts
import { createForm, defineField, defineGroup } from '@formtree/core'
import { z } from 'zod'
import { isUsernameAvailable } from './api'

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
const username = form.field('username')
const failure = document.getElementById('username-failure')!
const tryAgain = document.getElementById('username-try-again')!

tryAgain.addEventListener('click', () => {
  void username.validate()
})
username.subscribe(() => {
  failure.hidden = username.state.failedChecks.length == 0
})
```

</div>

While the check runs again, the list is empty and `state.validating` is `true`.
