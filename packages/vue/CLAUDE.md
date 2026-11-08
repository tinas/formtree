# @formtree/vue

## Architecture (src)

| File                 | Role                                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reactive-node.ts`   | wraps core nodes; one version ref per form and a `computed` over it per node read, so a component re-renders only when a value it reads changes                        |
| `use-form.ts`        | `createForm` + subscription + `deps` watch (bridge to the core store) + dispose on scope end; never provides                                                           |
| `node-context.ts`    | `provideFormNode(node)` (explicit), `useFormNode(Definition)` (nearest provided node of that definition, throws otherwise), `useFormNode()` (nearest node, loose type) |
| `use-field.ts`       | `useField(name \| node)`: `model` for v-model, `attrs` (null aria values mapped to undefined), `state`, ids                                                            |
| `create-formtree.ts` | `createFormtree(options)`: the app plugin; provides `FormDefaults` and, unless `devtools: false` or a production build, connects the devtools                          |
| `formtree-app.ts`    | `FORMTREE_APP` injection key (defaults + devtools registry); `useForm` reads it and registers its form, labelled with the creating component's name                    |
| `devtools/`          | `connectDevtools(app)`: a read-only inspector (node tree, node state) and a timeline layer; returns the registry forms register with                                   |

## Decisions

- Names match the React adapter (`useForm`, `useFormNode`, `useField`); only providing differs, because React provides through a component. `FormNode` avoids confusion with VNodes and DOM nodes.
- The `deps` watch in `use-form.ts` is the package's only `watch`; it writes to the core store, never to Vue state.
- Scope end drops the subscription and calls `form.dispose()`, which cancels pending async work; the form stays usable.
- `useFormNode(Definition)` matches by definition identity through core's `UniversalNode.definition`, and `useField` also accepts a node, so a business component binds v-model to a typed node.
- The package re-exports core, so an app depends on one package.
- `formatError` is the app's function, given once to `createFormtree`; the adapter knows no i18n library.
- Every node read is a `computed` over the version ref, so Vue re-renders a reader only when the value changes, which relies on core reads keeping their reference. `items` maps the core list through a `WeakMap` keyed by that list; `kind`, `definition` and `key` never change and are not tracked; `errorMessage` runs `formatError` inside its `computed`, so it tracks the refs the formatter reads, such as vue-i18n's locale; `listErrors` keeps one `computed` per `listErrorsKey`. Guarded by "a field component re-renders only when its own field changes", "a computed over array items is not re-evaluated when another field changes" and "an error summary re-renders only when the listed errors change" in `use-form.test.ts`, and "shows a translated message in the current language" in `create-formtree.test.ts`.
- Devtools are Vue only (React DevTools has no plugin API) and read-only, since an edit from them would be a write path outside the error producers of rule 4. They are on by default through `createFormtree` and off with `devtools: false`.
- Production builds drop the devtools: the code runs behind `process.env.NODE_ENV != 'production'`, declared locally in `create-formtree.ts` so no Node types leak into the `.d.ts`, and `sideEffects: false` here and in `@vue/devtools-api` / `@vue/devtools-kit` lets bundlers remove it.
- `@vue/devtools-api` is a required peer, as in Pinia 4, because the main entry imports it; an optional peer would break resolution when missing, and a dependency would fix the version for the app. Plugin types are derived from `setupDevtoolsPlugin`, since `@vue/devtools-kit` is not a direct dependency.
- `useForm` reads the registry with `hasInjectionContext()` first, so a form in a bare `effectScope` (tests) neither registers nor warns.
- The inspector lists declared children in definition order, then schema keys that have a value or an error, sorted; a schema cannot be asked for its keys.
- The Vue Devtools v8 sidebar shows only the descriptor's `logo`, which must be an `http(s)` or `/` URL or a bundled `custom-ic-baseline-*` name, so `logo` names the bundled `dynamic_form` icon.
- No console warnings for misuse; pitfalls go in the docs, and runtime visibility comes from the devtools.
