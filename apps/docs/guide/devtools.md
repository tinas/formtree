# Devtools

<div class="vue-only">

## Inspecting a Form {#vue-only-inspecting-a-form}

Install the plugin with `createFormtree`, and every form created with `useForm` appears in
[Vue Devtools](https://devtools.vuejs.org) while you develop:

```ts [main.ts]
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).use(createFormtree()).mount('#app')
```

![The formtree inspector in Vue Devtools, showing a checkout form as a tree of nodes](/devtools-inspector.png)

Tags show each node's kind and state, with errors counted as shown or hidden, and hovering a tag
explains it.

::: tip Read Only
The inspector only reads, so every value and error still comes from the app.
:::

## Following Changes {#vue-only-following-changes}

The Timeline tab records every change, check, and submit while its record button is on:

![The formtree timeline in Vue Devtools, showing a submit, an asynchronous check and a change](/devtools-timeline.png)

Selecting an event shows its path and the value there at that moment.

## Turning Them Off {#vue-only-turning-them-off}

To keep the forms out of Vue Devtools while you develop, pass `devtools: false`:

```ts [main.ts]
import { createFormtree } from '@formtree/vue'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App)
  .use(createFormtree({ devtools: false }))
  .mount('#app')
```

::: tip Production Builds
Production builds leave the devtools out without it.
:::

</div>

<div class="react-only">

The devtools come with the Vue adapter, because React DevTools offers no way for a library to add a
panel of its own.

</div>

<div class="javascript-only">

The devtools come with the Vue adapter and show forms in Vue Devtools, so a form built with the core
alone does not appear in them.

</div>
