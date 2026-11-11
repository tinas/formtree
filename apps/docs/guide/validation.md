# Validation

## Rules Across Values

A rule that compares values goes in `validate` on the group that holds them:

```ts twoslash
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export const signUpForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
    password: z.string({ error: 'Enter a password' }).min(8, {
      error: 'Use at least 8 characters',
    }),
    confirmPassword: z.string({ error: 'Repeat the password' }),
  }),
  validate: ({ value: { password, confirmPassword } }) =>
    confirmPassword != undefined && confirmPassword != password
      ? { path: 'confirmPassword', code: 'Passwords do not match' }
      : undefined,
})
```

`validate` receives the group's draft, so a value the user has not filled in yet is `undefined`.

::: tip Lists
A list has a `validate` of its own for rules across its items, as [Arrays](/guide/arrays) shows.
:::

## Rules in the Schema

A rule that compares keys of one schema can also stay in that schema as a refinement:

```ts twoslash
// @noStaticSemanticInfo
import { defineGroup } from '@formtree/core'
import { z } from 'zod'
// ---cut---
export const signUpForm = defineGroup({
  schema: z
    .object({
      email: z.email({ error: 'Enter a valid email address' }),
      password: z.string({ error: 'Enter a password' }).min(8, {
        error: 'Use at least 8 characters',
      }),
      confirmPassword: z.string({ error: 'Repeat the password' }),
    })
    .refine(value => value.confirmPassword == value.password, {
      path: ['confirmPassword'],
      error: 'Passwords do not match',
    }),
})
```

Zod runs a refinement only once every key holds a value of the right type, so its error waits for
fields the rule does not compare, while `validate` reports as soon as the compared values disagree.
Keep the refinement when the schema has to be complete on its own, for example because the server
parses it too.

## Validating on Every Change

Schemas and rules run when the form is created and after every change, before `setValue` returns:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'

const signUpForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
    password: z.string({ error: 'Enter a password' }).min(8, {
      error: 'Use at least 8 characters',
    }),
    confirmPassword: z.string({ error: 'Repeat the password' }),
  }),
  validate: ({ value: { password, confirmPassword } }) =>
    confirmPassword != undefined && confirmPassword != password
      ? { path: 'confirmPassword', code: 'Passwords do not match' }
      : undefined,
})
const form = createForm(signUpForm)
// ---cut---
const email = form.field('email')

email.setValue('ada@')
const { valid, errors } = email.state
```

`valid` is already `false`, while `errors` holds only the errors the user should see now, which
[Showing Errors](/guide/showing-errors) explains.

## Order of Checks

A group's schema and its `validate` run in the same step, so one change can produce errors from
both:

```ts twoslash
// @noStaticSemanticInfo
import { createForm, defineGroup } from '@formtree/core'
import { z } from 'zod'

const signUpForm = defineGroup({
  schema: z.object({
    email: z.email({ error: 'Enter a valid email address' }),
    password: z.string({ error: 'Enter a password' }).min(8, {
      error: 'Use at least 8 characters',
    }),
    confirmPassword: z.string({ error: 'Repeat the password' }),
  }),
  validate: ({ value: { password, confirmPassword } }) =>
    confirmPassword != undefined && confirmPassword != password
      ? { path: 'confirmPassword', code: 'Passwords do not match' }
      : undefined,
})
const form = createForm(signUpForm)
// ---cut---
const password = form.field('password')
const confirmPassword = form.field('confirmPassword')

password.setValue('short')
confirmPassword.setValue('shorter')
```

Each replaces only its own errors. A server check comes last, once neither reports an error on its
value, as [Async Validation](/guide/async-validation) shows.
