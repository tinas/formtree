# Validation

A schema validates each value, and `validate` holds the rules that compare values.

## Comparing Values

A rule that compares values, such as a confirmation that has to match the password, goes in
`validate`, on the group that holds both values:

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

`validate` receives the draft of the group, so a value the user has not filled in yet is
`undefined`. Lists have a `validate` of their own, as [Arrays](/guide/arrays#rules-across-rows)
shows.

## Defining Rules in the Schema

A rule that compares keys of a single schema can also remain in that schema, as a refinement:

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

A refinement remains the better choice when the schema has to be complete on its own, for example
because the server parses it as well.

::: details Why Rules Report Sooner
Zod runs a refinement only once every key holds a value of the right type, so its error waits for
fields the rule does not compare. `validate` reports as soon as the compared values disagree.
:::

## Validating on Every Change

Schemas and rules run when the form is created and again after every change, before `setValue`
returns:

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

At this point `valid` is already `false`, while `errors` holds only the errors the user should see
now, as [Showing Errors](/guide/showing-errors) explains.

## Running Schemas and Rules Together

The schema of a group and its `validate` run in the same step, so a single change can produce
errors from both:

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

Each of them replaces only its own errors. A server check runs last, once neither reports an error
on its value, as [Async Validation](/guide/async-validation) shows.
