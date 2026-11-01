# App Defaults

Some choices are the same for every form of an app: errors appear in the user's language, a
failed submit scrolls the same way, every form shows up in the same devtools. `createFormtree`
makes those choices once, as an app plugin:

```ts
// main.ts
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import App from './app.vue'

createApp(App).use(createFormtree()).mount('#app')
```

With no options, forms behave exactly as without the plugin, and while developing they appear in
[Vue Devtools](#devtools). Each option below changes one behaviour for every form created with
`useForm` inside the app. [`FormtreeOptions`](/api/@formtree/vue/interfaces/FormtreeOptions)
lists them.

## Translating errors

The schemas of an app report translation keys, such as `'checkout.city.required'`, and every
error has to reach the screen in the user's language. Give the plugin one `formatError`:

```ts
// main.ts
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './app.vue'
import { messages } from './messages'

const i18n = createI18n({ legacy: false, locale: 'en', messages })

createApp(App)
  .use(i18n)
  .use(
    createFormtree({
      formatError: error => i18n.global.t(error.code, { ...error.params }),
    }),
  )
  .mount('#app')
```

Every input then shows `errorMessage`, the field's first visible error as text, and knows nothing
about translation:

```vue
<p :id="field.errorId">{{ field.errorMessage }}</p>
```

`errorMessage` runs `formatError` each time a template reads it, so switching the locale
re-renders every visible message in the new language without validating again. An error summary
uses the same function through `form.formatError(error)`.
[Translating errors](/guide/errors-and-focus#translating-errors) covers `params` and the messages
a schema library writes by default.

## Moving focus

A failed submit focuses the first invalid field. Under a sticky header, that field can end up
hidden, and a jump to it can feel abrupt. `focusElement` decides how every form moves focus:

```ts
createFormtree({
  focusElement: element => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    element.focus({ preventScroll: true })
    element.scrollIntoView({
      block: 'center',
      behavior: reducedMotion ? 'instant' : 'smooth',
    })
  },
})
```

An app that shows an error summary at the top of every form sends focus there instead, with
`shouldFocusError: 'summary'`. [Errors and Focus](/guide/errors-and-focus#focus-after-a-failed-submit)
explains both options.

## When errors appear

By default an error appears once its field is left. An app whose forms should stay quiet until
the first submit says so once:

```ts
createFormtree({ mode: 'onSubmit' })
```

`reValidateMode` decides what happens after an error has been visible.
[Validation](/guide/validation#display-modes) describes every mode.

## Overriding a default

A default is a starting point. An option passed to `useForm` wins for that form:

```ts
const form = useForm(newsletterGroup, { mode: 'onChange' })
```

An option passed as `undefined` falls back to the default, so a component can forward an
optional prop without erasing it. A definition can still set its own `mode` and
`reValidateMode`, and the nearest one wins, as in the core.

The plugin is optional. A form created outside the app, such as one in a test's `effectScope`,
does not see it and uses the core's defaults.

## Devtools

A customer presses Continue on the delivery step and nothing happens. No error is on screen, so
the question is which node is still invalid, and why its error is not shown yet. While
developing, `createFormtree` adds a formtree tab to Vue Devtools that answers it: the forms of the
app as trees of nodes with the state of each, and a timeline of every change, check and submit.

Vue Devtools itself runs as a browser extension or through `vite-plugin-vue-devtools`. The plugin
talks to it through `@vue/devtools-api`, a peer dependency of `@formtree/vue` that npm and pnpm
install along with it.

A production build leaves the devtools out. Their code runs only while `process.env.NODE_ENV` is
not `'production'`, which every bundler replaces, so nothing of it ships. To leave the forms out
of the devtools while developing as well:

```ts
createFormtree({ devtools: false })
```

### The inspector

![The formtree inspector in Vue Devtools, showing a checkout form as a tree of nodes](/devtools-inspector.png)

Every form created with `useForm` inside the app appears in the formtree inspector, under the
name of the component that created it and its id. Its nodes follow the tree of the form: a
group's children first, then the keys of its schema. The first tag says where a node comes from:
`field`, `group` or `array` for a node with a definition of its own, `lens` for a key of its
parent's schema. Hovering a tag explains it.

The other tags describe the state of the subtree. Errors are counted by whether the user sees
them: `1 error shown` is on screen, `2 errors hidden` exist but wait for the display mode, a
blur or a submit. Every value is validated on every change, so a step the customer has not
reached yet already counts its hidden errors. `submitted ×1` counts the submits of the node
itself: submitting a step marks the step, not the form. `inactive`, `checking`, `submitting` and
`dirty` follow the node's state.

That answers the delivery step: `delivery.method` shows `1 error hidden` because no method is
chosen, and its error waits for the field to be blurred. Selecting a node shows its state and its
errors, the visible ones and all of them.

A schema cannot be asked for its keys, so a key of a schema appears once it has a value or an
error. An optional key that is still empty is not listed.

### The timeline

![The formtree timeline in Vue Devtools, showing a submit, an asynchronous check and a change](/devtools-timeline.png)

The Timeline tab of the formtree inspector records what happens in the forms once its record
button is on. A change, a blur and a reset name the path they touched. An asynchronous check
records its start and its end, with the errors it returned, or that it was reused from the cache
or cancelled by the next change. A submit records its start and its outcome: `success`,
`invalid`, `rejected` or `skipped`.

Selecting an event shows the form, the path and the value at that path after the event.

### Read-only

Nothing can be edited from the devtools. A value changed there would bypass the components that
write it and the rules that check it, and every error would no longer come from a schema, a rule,
a check or the server. The plugin only reads.
