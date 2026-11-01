# Devtools

A customer presses Continue on the delivery step and nothing happens. No error is on screen, so
the question is which node is still invalid, and why its error is not shown yet. The formtree
plugin for Vue Devtools answers it: it lists the forms of the app as trees of nodes with the
state of each, and records every change, check and submit on a timeline.

## Installing

The plugin talks to Vue Devtools through `@vue/devtools-api`, an optional peer dependency of
`@formtree/vue`. Install it next to the adapter:

::: code-group

```sh [pnpm]
pnpm add @vue/devtools-api
```

```sh [npm]
npm install @vue/devtools-api
```

```sh [yarn]
yarn add @vue/devtools-api
```

:::

Install the plugin in development only:

```ts twoslash
import type { Component } from 'vue'
declare const App: Component
declare global {
  interface ImportMeta {
    readonly env: { readonly DEV: boolean }
  }
}
// ---cut---
import { formtreeDevtools } from '@formtree/vue/devtools'
import { createApp } from 'vue'

const app = createApp(App)

if (import.meta.env.DEV) {
  app.use(formtreeDevtools)
}

app.mount('#app')
```

A production build replaces `import.meta.env.DEV` with `false` and drops the branch. The package
has no side effects, so the import is dropped with it and nothing of the plugin ships. Vue
Devtools itself runs as a browser extension or through `vite-plugin-vue-devtools`.

## The inspector

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

## The timeline

![The formtree timeline in Vue Devtools, showing a submit, an asynchronous check and a change](/devtools-timeline.png)

The Timeline tab of the formtree inspector records what happens in the forms once its record
button is on. A change, a blur and a reset name the path they touched. An asynchronous check
records its start and its end, with the errors it returned, or that it was reused from the cache
or cancelled by the next change. A submit records its start and its outcome: `success`,
`invalid`, `rejected` or `skipped`.

Selecting an event shows the form, the path and the value at that path after the event.

## Read-only

Nothing can be edited from the devtools. A value changed there would bypass the components that
write it and the rules that check it, and every error would no longer come from a schema, a rule,
a check or the server. The plugin only reads.

A form created outside a component and outside the app, such as one in a test, has no app to
report to and is not listed.
