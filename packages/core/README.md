# @formtree/core

A headless form tree for any UI layer. A form is built from definitions like a route tree, its state lives in one place, and every node of the tree, a single field included, validates and submits on its own. This package is the framework-free engine: Standard Schema validation, no runtime dependencies.

```sh
pnpm add @formtree/core zod
```

formtree validates with any [Standard Schema](https://standardschema.dev) library, such as Zod, Valibot or ArkType. For Vue or React, install [`@formtree/vue`](https://www.npmjs.com/package/@formtree/vue) or [`@formtree/react`](https://www.npmjs.com/package/@formtree/react) instead; each re-exports everything from the core.

Documentation: https://form-tree.netlify.app/guide/

## License

MIT
