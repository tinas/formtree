# Binding Inputs

## A Reusable Input

<div class="vue-only">

Give `useField` a field's name instead of its node, and one input component binds every field:

::: code-group

```vue [contact-form.vue]
<script setup lang="ts">
import { provideFormNode, useForm } from '@formtree/vue'
import { contactForm } from './forms/contact-form'
import TextField from './text-field.vue'

const form = useForm(contactForm)
provideFormNode(form)
</script>

<template>
  <TextField name="name" label="Name" />
  <TextField name="email" label="Email" />
  <TextField name="message" label="Message" />
</template>
```

```vue [text-field.vue]
<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<string>(() => props.name)
</script>

<template>
  <div>
    <label :for="field.id">{{ label }}</label>
    <input v-model="field.model" v-bind="field.attrs" />
    <p :id="field.errorId">{{ field.errorMessage }}</p>
  </div>
</template>
```

:::

`useField` looks the name up in the node that `provideFormNode` makes available to the components
below it. [`FieldView`](/api/@formtree/vue/interfaces/FieldView) lists what it returns.

</div>

<div class="react-only">

Give `useField` a field's name instead of its node, and one input component binds every field:

::: code-group

```tsx [contact-form.tsx]
import { FormNodeProvider, useForm } from '@formtree/react'
import { contactForm } from './forms/contact-form'
import { TextField } from './text-field'

export function ContactForm() {
  const form = useForm(contactForm)

  return (
    <FormNodeProvider node={form}>
      <TextField name="name" label="Name" />
      <TextField name="email" label="Email" />
      <TextField name="message" label="Message" />
    </FormNodeProvider>
  )
}
```

```tsx [text-field.tsx]
import { useField } from '@formtree/react'

export function TextField({ name, label }: { name: string; label: string }) {
  const field = useField<string>(name)

  return (
    <div>
      <label htmlFor={field.id}>{label}</label>
      <input
        {...field.attrs}
        value={field.value ?? ''}
        onChange={event => field.setValue(event.target.value)}
      />
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}
```

:::

`useField` looks the name up in the node that `<FormNodeProvider>` makes available to the
components below it. [`FieldView`](/api/@formtree/react/interfaces/FieldView) lists what it returns.

</div>

<div class="javascript-only">

Move `bindInput` into a module of its own and give it a field's node, and one function binds every
input of every form:

::: code-group

```ts twoslash [contact-form.ts]
// @noStaticSemanticInfo
// @filename: bind-input.ts
import type { FieldNode } from '@formtree/core'

export declare function bindInput(field: FieldNode<string | undefined, unknown>): () => void
// @filename: contact-form.ts
// ---cut---
import { createForm } from '@formtree/core'
import { bindInput } from './bind-input'
import { contactForm } from './forms/contact-form'

const form = createForm(contactForm, { id: 'contact' })

bindInput(form.field('name'))
bindInput(form.field('email'))
bindInput(form.field('message'))
```

```ts twoslash [bind-input.ts]
// @noStaticSemanticInfo
import type { FieldAttributes, FieldNode } from '@formtree/core'

type TextInput = HTMLInputElement | HTMLTextAreaElement

export function bindInput(field: FieldNode<string | undefined, unknown>) {
  const input = document.getElementById(field.id) as TextInput
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  showField()
  return field.subscribe(showField)

  function showField() {
    input.value = field.state.value ?? ''
    error.textContent = field.errorMessage ?? ''
    setAttributes(input, field.attributes)
  }
}

export function setAttributes(element: Element, attributes: FieldAttributes) {
  for (const [attribute, value] of Object.entries(attributes)) {
    if (value == null) {
      element.removeAttribute(attribute)
    } else {
      element.setAttribute(attribute, value)
    }
  }
}
```

```html [index.html]
<label for="contact:name">Name</label>
<input id="contact:name" />
<p id="contact:name:error"></p>

<label for="contact:email">Email</label>
<input id="contact:email" />
<p id="contact:email:error"></p>

<label for="contact:message">Message</label>
<textarea id="contact:message"></textarea>
<p id="contact:message:error"></p>
```

:::

`bindInput` calls `showField` whenever the field changes and returns the function that stops it.
`showField` writes the value, the error, and the input's attributes, so a reset shows on the page
and a screen reader reads the error with the input.

</div>

## Marking Required Fields

To mark a required field's label, read `state.required`, which is true when the field's schema rejects
an empty value:

<div class="vue-only">

```vue{11-13} [text-field.vue]
<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<string>(() => props.name)
</script>

<template>
  <div>
    <label :for="field.id">
      {{ label }}<span v-if="field.state.required" aria-hidden="true">*</span>
    </label>
    <input v-model="field.model" v-bind="field.attrs" />
    <p :id="field.errorId">{{ field.errorMessage }}</p>
  </div>
</template>
```

</div>

<div class="react-only">

```tsx{8-11} [text-field.tsx]
import { useField } from '@formtree/react'

export function TextField({ name, label }: { name: string; label: string }) {
  const field = useField<string>(name)

  return (
    <div>
      <label htmlFor={field.id}>
        {label}
        {field.state.required && <span aria-hidden="true">*</span>}
      </label>
      <input
        {...field.attrs}
        value={field.value ?? ''}
        onChange={event => field.setValue(event.target.value)}
      />
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}
```

</div>

<div class="javascript-only">

```ts{13} twoslash [bind-input.ts]
// @noStaticSemanticInfo
import type { FieldAttributes, FieldNode } from '@formtree/core'

type TextInput = HTMLInputElement | HTMLTextAreaElement
declare function setAttributes(element: HTMLElement, attributes: FieldAttributes): void
// ---cut---
export function bindInput(field: FieldNode<string | undefined, unknown>) {
  const input = document.getElementById(field.id) as TextInput
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  showField()
  return field.subscribe(showField)

  function showField() {
    input.value = field.state.value ?? ''
    error.textContent = field.errorMessage ?? ''
    input.labels?.[0]?.classList.toggle('required', field.state.required)
    setAttributes(input, field.attributes)
  }
}
```

A CSS rule such as `.required::after { content: '*' }` turns the class into an asterisk.

</div>

The input's attributes already carry `aria-required`, so a screen reader announces the field as
required. The schema is asked once, with the form empty, so typing never asks it again. A part that
[`activeWhen`](/guide/conditional-fields) turns on is marked while it is on, but a key that another
answer in the same schema requires is not. Neither is a field that a group's `validate` rule requires,
or one whose schema answers asynchronously.

## Number Inputs

A number input converts its text in both directions and writes `undefined` when it is empty:

<div class="vue-only">

```vue [number-field.vue]
<script setup lang="ts">
import { useField } from '@formtree/vue'
import { computed } from 'vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<number>(() => props.name)

const text = computed({
  get: () => (field.model == undefined ? '' : String(field.model)),
  set: value => {
    field.model = value === '' ? undefined : Number(value)
  },
})
</script>

<template>
  <div>
    <label :for="field.id">{{ label }}</label>
    <input v-model="text" v-bind="field.attrs" type="number" />
    <p :id="field.errorId">{{ field.errorMessage }}</p>
  </div>
</template>
```

</div>

<div class="react-only">

```tsx [number-field.tsx]
import { useField } from '@formtree/react'

interface NumberFieldProps {
  name: string
  label: string
}

export function NumberField({ name, label }: NumberFieldProps) {
  const field = useField<number>(name)

  return (
    <div>
      <label htmlFor={field.id}>{label}</label>
      <input
        {...field.attrs}
        type="number"
        value={field.value ?? ''}
        onChange={event => field.setValue(toNumber(event.target.value))}
      />
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}

function toNumber(text: string) {
  return text == '' ? undefined : Number(text)
}
```

</div>

<div class="javascript-only">

```ts{4-6,10,16-19,24-26} twoslash [bind-number-input.ts]
// @noStaticSemanticInfo
// @filename: bind-input.ts
import type { FieldAttributes } from '@formtree/core'

export declare function setAttributes(element: HTMLElement, attributes: FieldAttributes): void
// @filename: bind-number-input.ts
// ---cut---
import type { FieldNode } from '@formtree/core'
import { setAttributes } from './bind-input'

export function bindNumberInput(
  field: FieldNode<number | undefined, unknown>,
) {
  const input = document.getElementById(field.id) as HTMLInputElement
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(readNumber()))
  input.addEventListener('blur', () => field.blur())
  showField()
  return field.subscribe(showField)

  function showField() {
    if (readNumber() != field.state.value) {
      input.value =
        field.state.value == undefined ? '' : String(field.state.value)
    }
    error.textContent = field.errorMessage ?? ''
    setAttributes(input, field.attributes)
  }

  function readNumber() {
    return input.value == '' ? undefined : Number(input.value)
  }
}
```

The check in `showField` leaves a number the user is still typing alone.

</div>

Clearing the input empties the field instead of writing `0`.

## Selects

A select starts with a disabled option for the empty field, so nothing looks chosen before the
user picks:

<div class="vue-only">

```vue [select-field.vue]
<script setup lang="ts">
import { useField } from '@formtree/vue'

interface SelectOption {
  readonly value: string
  readonly label: string
}

const props = defineProps<{
  name: string
  label: string
  options: ReadonlyArray<SelectOption>
}>()

const field = useField<string>(() => props.name)
</script>

<template>
  <div>
    <label :for="field.id">{{ label }}</label>
    <select v-model="field.model" v-bind="field.attrs">
      <option :value="undefined" disabled>Choose…</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <p :id="field.errorId">{{ field.errorMessage }}</p>
  </div>
</template>
```

</div>

<div class="react-only">

```tsx [select-field.tsx]
import { useField } from '@formtree/react'

interface SelectOption {
  readonly value: string
  readonly label: string
}

interface SelectFieldProps {
  readonly name: string
  readonly label: string
  readonly options: ReadonlyArray<SelectOption>
}

export function SelectField({ name, label, options }: SelectFieldProps) {
  const field = useField<string>(name)

  return (
    <div>
      <label htmlFor={field.id}>{label}</label>
      <select
        {...field.attrs}
        value={field.value ?? ''}
        onChange={event => field.setValue(event.target.value)}
      >
        <option value="" disabled>
          Choose…
        </option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}
```

</div>

<div class="javascript-only">

::: code-group

```ts{4-7,11-13,19} twoslash [bind-select.ts]
// @noStaticSemanticInfo
// @filename: bind-input.ts
import type { FieldAttributes } from '@formtree/core'

export declare function setAttributes(element: HTMLElement, attributes: FieldAttributes): void
// @filename: bind-select.ts
// ---cut---
import type { FieldNode } from '@formtree/core'
import { setAttributes } from './bind-input'

export function bindSelect<Value extends string>(
  field: FieldNode<Value | undefined, unknown>,
  choices: ReadonlyArray<Value>,
) {
  const select = document.getElementById(field.id) as HTMLSelectElement
  const error = document.getElementById(field.errorId)!

  select.addEventListener('change', () =>
    field.setValue(choices.find(choice => choice == select.value)),
  )
  select.addEventListener('blur', () => field.blur())
  showField()
  return field.subscribe(showField)

  function showField() {
    select.value = field.state.value ?? ''
    error.textContent = field.errorMessage ?? ''
    setAttributes(select, field.attributes)
  }
}
```

```html [index.html]
<label for="account:role">Role</label>
<select id="account:role">
  <option value="" disabled selected>Choose…</option>
  <option value="member">Member</option>
  <option value="admin">Admin</option>
</select>
<p id="account:role:error"></p>
```

:::

`choices` turns the selected text back into one of the field's values, as in
`bindSelect(form.field('role'), Object.values(ROLE))`.

</div>

## Checkboxes

A checkbox reads and writes `checked` instead of `value`:

<div class="vue-only">

```vue [checkbox-field.vue]
<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{ name: string; label: string }>()

const field = useField<boolean>(() => props.name)
</script>

<template>
  <div>
    <input v-model="field.model" v-bind="field.attrs" type="checkbox" />
    <label :for="field.id">{{ label }}</label>
    <p :id="field.errorId">{{ field.errorMessage }}</p>
  </div>
</template>
```

</div>

<div class="react-only">

```tsx [checkbox-field.tsx]
import { useField } from '@formtree/react'

interface CheckboxFieldProps {
  name: string
  label: string
}

export function CheckboxField({ name, label }: CheckboxFieldProps) {
  const field = useField<boolean>(name)

  return (
    <div>
      <input
        {...field.attrs}
        type="checkbox"
        checked={field.value ?? false}
        onChange={event => field.setValue(event.target.checked)}
      />
      <label htmlFor={field.id}>{label}</label>
      <p id={field.errorId}>{field.errorMessage}</p>
    </div>
  )
}
```

</div>

<div class="javascript-only">

```ts{4,8-10,16} twoslash [bind-checkbox.ts]
// @noStaticSemanticInfo
// @filename: bind-input.ts
import type { FieldAttributes } from '@formtree/core'

export declare function setAttributes(element: HTMLElement, attributes: FieldAttributes): void
// @filename: bind-checkbox.ts
// ---cut---
import type { FieldNode } from '@formtree/core'
import { setAttributes } from './bind-input'

export function bindCheckbox(field: FieldNode<true | undefined, unknown>) {
  const checkbox = document.getElementById(field.id) as HTMLInputElement
  const error = document.getElementById(field.errorId)!

  checkbox.addEventListener('change', () =>
    field.setValue(checkbox.checked ? true : undefined),
  )
  checkbox.addEventListener('blur', () => field.blur())
  showField()
  return field.subscribe(showField)

  function showField() {
    checkbox.checked = field.state.value ?? false
    error.textContent = field.errorMessage ?? ''
    setAttributes(checkbox, field.attributes)
  }
}
```

::: tip Required Boxes
A box the user must tick, such as accepting the terms, takes only `true`, so an unticked box leaves
the field empty.
:::

</div>

[Checkbox Group](/examples/checkbox-group) binds several boxes to one list.

## Radio Buttons

Radio buttons share one value, so the field's attributes go on the group around them:

<div class="vue-only">

```vue [radio-field.vue]
<script setup lang="ts">
import { useField } from '@formtree/vue'

const props = defineProps<{
  name: string
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
}>()

const field = useField<string>(() => props.name)
</script>

<template>
  <fieldset v-bind="field.attrs" role="radiogroup" tabindex="-1">
    <legend>{{ label }}</legend>
    <label v-for="option in options" :key="option.value">
      <input
        v-model="field.model"
        type="radio"
        :name="field.attrs.name"
        :value="option.value"
        @blur="field.attrs.onBlur"
      />
      {{ option.label }}
    </label>
    <p :id="field.errorId">{{ field.errorMessage }}</p>
  </fieldset>
</template>
```

</div>

<div class="react-only">

```tsx [radio-field.tsx]
import { useField } from '@formtree/react'

interface RadioFieldProps {
  name: string
  label: string
  options: ReadonlyArray<{ value: string; label: string }>
}

export function RadioField({ name, label, options }: RadioFieldProps) {
  const field = useField<string>(name)

  return (
    <fieldset {...field.attrs} role="radiogroup" tabIndex={-1}>
      <legend>{label}</legend>
      {options.map(option => (
        <label key={option.value}>
          <input
            type="radio"
            name={field.attrs.name}
            value={option.value}
            checked={field.value == option.value}
            onChange={() => field.setValue(option.value)}
            onBlur={field.attrs.onBlur}
          />
          {option.label}
        </label>
      ))}
      <p id={field.errorId}>{field.errorMessage}</p>
    </fieldset>
  )
}
```

</div>

<div class="javascript-only">

```ts twoslash [bind-radio-group.ts]
// @noStaticSemanticInfo
// @filename: bind-input.ts
import type { FieldAttributes } from '@formtree/core'

export declare function setAttributes(element: HTMLElement, attributes: FieldAttributes): void
// @filename: bind-radio-group.ts
// ---cut---
import type { FieldNode } from '@formtree/core'
import { setAttributes } from './bind-input'

export function bindRadioGroup(
  field: FieldNode<string | undefined, unknown>,
) {
  const group = document.getElementById(field.id) as HTMLFieldSetElement
  const radios = group.querySelectorAll<HTMLInputElement>('[type="radio"]')
  const error = document.getElementById(field.errorId)!

  for (const radio of radios) {
    radio.addEventListener('change', () => field.setValue(radio.value))
    radio.addEventListener('blur', () => field.blur())
  }
  showField()
  return field.subscribe(showField)

  function showField() {
    for (const radio of radios) {
      radio.checked = radio.value == field.state.value
    }
    error.textContent = field.errorMessage ?? ''
    setAttributes(group, field.attributes)
  }
}
```

</div>

The group holds the field's `id` and `tabindex="-1"`, so a failed submit can focus it, and
`role="radiogroup"` lets screen readers read its error with it. Every radio shares the field's
`name`, so only one of them is checked at a time. [Radio Group](/examples/radio-group) shows this
live.

## Typed Bindings

A name cannot tell TypeScript what its field holds, but a node can. Bind a field's node, and
TypeScript rejects a value the schema does not accept:

<div class="vue-only">

```ts twoslash
// @errors: 2322
import { useField, useForm } from '@formtree/vue'
import { accountForm } from './forms/account'
// ---cut---
const form = useForm(accountForm)
const role = useField(form.field('role'))

role.model = 'owner'
```

</div>

<div class="react-only">

```tsx
const form = useForm(accountForm)
const role = useField(form.field('role'))

role.setValue('owner')
```

</div>

<div class="javascript-only">

```ts twoslash
// @errors: 2345
import { createForm } from '@formtree/core'
import { accountForm } from './forms/account'
// ---cut---
const form = createForm(accountForm)
const role = form.field('role')

role.setValue('owner')
```

</div>

## Switching Languages

<div class="vue-only">

Errors on screen follow a language switch by themselves, because each field runs `formatError`
again when vue-i18n's locale changes.

</div>

<div class="react-only">

Pass the current language to `<FormtreeProvider>`:

```tsx{4,8,11} [app.tsx]
import type { FormError } from '@formtree/react'
import { FormtreeProvider } from '@formtree/react'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { ContactForm } from './contact-form'

export function App() {
  const { i18n } = useTranslation()

  return (
    <FormtreeProvider formatError={formatError} language={i18n.language}>
      <ContactForm />
    </FormtreeProvider>
  )
}

function formatError(error: FormError) {
  return i18next.t(error.code, { ...error.params })
}
```

When `language` changes, every component that reads a form re-renders, and `formatError` reads the new
language from i18next.

</div>

<div class="javascript-only">

Call `showField` again when the language changes:

```ts{2,13} twoslash [bind-input.ts]
// @noStaticSemanticInfo
// @filename: i18next.d.ts
declare module 'i18next' {
  const i18next: { on: (event: 'languageChanged', listener: () => void) => void }
  export default i18next
}
// @filename: bind-input.ts
// ---cut---
import type { FieldAttributes, FieldNode } from '@formtree/core'
import i18next from 'i18next'

type TextInput = HTMLInputElement | HTMLTextAreaElement

export function bindInput(field: FieldNode<string | undefined, unknown>) {
  const input = document.getElementById(field.id) as TextInput
  const error = document.getElementById(field.errorId)!

  input.addEventListener('input', () => field.setValue(input.value))
  input.addEventListener('blur', () => field.blur())
  showField()
  i18next.on('languageChanged', showField)
  return field.subscribe(showField)

  function showField() {
    input.value = field.state.value ?? ''
    error.textContent = field.errorMessage ?? ''
    setAttributes(input, field.attributes)
  }
}
// ---cut-after---

export function setAttributes(element: HTMLElement, attributes: FieldAttributes) {
  for (const [attribute, value] of Object.entries(attributes)) {
    if (value == null) {
      element.removeAttribute(attribute)
    } else {
      element.setAttribute(attribute, value)
    }
  }
}
```

</div>
