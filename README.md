# formtree

A headless form tree for any UI layer. A form is built from definitions like a route tree, its state lives in one place, and every node of the tree, a single field included, validates and submits on its own.

| Package          | What it is                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `@formtree/core` | Framework-free engine. Standard Schema validation, no runtime dependencies.              |
| `@formtree/vue`  | Vue adapter: reactive nodes, `injectFormNode(Definition)`, `useField(name)` for v-model. |

## License

MIT
