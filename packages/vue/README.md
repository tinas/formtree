# @formtree/vue

Vue adapter for formtree, a headless form tree. A form is built from definitions like a route tree, its state lives in one place, and every node of the tree, a single field included, validates and submits on its own. The adapter connects the core to Vue's reactivity and lifecycle and adds no behaviour of its own.

```sh
pnpm add @formtree/vue zod
```

The package re-exports [`@formtree/core`](https://www.npmjs.com/package/@formtree/core), so definitions and types are imported from `@formtree/vue` as well. It needs Vue 3.5 or later.

Documentation: https://form-tree.netlify.app/vue/

## License

MIT
