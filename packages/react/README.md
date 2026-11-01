# @formtree/react

React adapter for formtree, a headless form tree. A form is built from definitions like a route tree, its state lives in one place, and every node of the tree, a single field included, validates and submits on its own. The adapter connects the core to React's rendering and lifecycle and adds no behaviour of its own.

```sh
pnpm add @formtree/react zod
```

The package re-exports [`@formtree/core`](https://www.npmjs.com/package/@formtree/core), so definitions and types are imported from `@formtree/react` as well. It needs React 18.3 or later.

Documentation: https://form-tree.netlify.app/react/

## License

MIT
