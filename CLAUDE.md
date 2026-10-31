# formtree

Headless form tree. `packages/core` is the framework-free engine, `packages/vue` and `packages/react` the adapters. `apps/playground` drives the core with plain DOM code; `apps/vue-playground` and `apps/react-playground` build the same wizard with Vue SFCs and React components. The docs guide is the spec: `apps/docs/guide/design-rules.md` holds the ten design rules and what formtree leaves out on purpose, `apps/docs/guide/how-it-works.md` the model. The decisions below record why the code has its shape; add new ones here.

## Architecture (packages/core/src)

| Folder         | Role                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `definitions/` | `defineField`, `defineGroup`, `arrayOf` (+ `WithDeps` variants), type-level `DraftOf` / `InputOf` / `OutputOf` / `DepsOf`, erased runtime options |
| `state/`       | `FormState` and pure transitions (value writes, resets, array edits, errors, submit flags); array items are addressed by key-based node ids       |
| `validation/`  | scope walk, sync schema/validate runs, output composition, async checks, display-mode visibility                                                  |
| `nodes/`       | public node types, path navigation types, the universal runtime node object                                                                       |
| `form/`        | `createForm`, the runtime holder, operations that commit state, submit pipeline, focus                                                            |

State is immutable; every mutation goes through a pure transition and then `commitWithValidation` / `commitState`. Side effects (timers, abort controllers, schema promises) live only in `validation/async-validation.ts` and `validation/validation-pass.ts`.

### Core decisions

- Definitions carry a phantom `'~types'` and an erased `'~options'`. Definition types stay covariant, so an annotated recursive definition type-checks, and runtime options are read behind one cast.
- `AnyArrayDefinition` is a non-generic interface. A generic one made `Definition` compute itself, and `createForm`'s constraint failed with TS2589.
- `activeWhen` keys are inferred as their own mapped type parameter (`ActiveKeys`). With the whole object as one type parameter, the callbacks lose contextual typing and `value` is implicitly `any`.
- `defineGroup*` return `NoInfer<Children>` and `NoInfer<ActiveKeys>`. Without it, an inline nested `defineGroup({ schema })` inferred `Record<string, Definition>` children from the outer call and demanded `childDeps`.
- In the draft, field children are optional keys; declared groups and arrays are required and built by `createForm` (rule 7).
- Node ids are key-based (`cart.items.[k3].quantity`); paths shown to users use indexes. Errors, touched state and submit counts hang off the id, so a moved row needs no remapping (rule 8). The baseline tree keeps its own array keys, so rows rebaseline independently; a saved new row enters the baseline after its previous sibling.
- A validation pass is a scope walk, then sync runs memoised by value and deps reference, then async reconciliation. Deps are pinned by shallow equality, so a `childDeps` that returns a new object with the same content does not rebuild the schema.
- One runtime object per node id (`UniversalNode`); field, group and array nodes are views in types only, so `form.field('x') === form.group('x')` and adapters can key on nodes. An undeclared node reports `kind: 'lens'`, since that object cannot know which accessor returned it.
- Node interface methods are function-typed properties: destructuring is safe (no unbound-method) and nodes stay invariant.
- A write to a missing index or a removed row is ignored: no throw, state unchanged.
- An annotated recursive definition navigates its children as lens nodes, and its output is the annotated type; TypeScript cannot infer the child types of a self-referencing constant. At runtime those nodes are still defined and validated.
- `FormError.code` is the message the schema reports, a readable text or a translation key; the schema library's own issue code lands in `params.code`. The name stays: the UI translates `code` at render time, and `params` carries the issue values for interpolation.
- Every node carries an internal `subscribe` (the form's), so an adapter that holds only a node can follow it; React's `useNodeState` uses it.
- `setDeps` with dependencies equal key by key to the current ones does nothing. React passes a new `deps` object on every render, and a notification there would loop.
- `handleSubmit` handlers receive only the output, no `{ node }` context; the caller already holds the node. Add it when a real need appears.
- Focus has two options: `shouldFocusError` picks the target (DOM order, summary rule; the core's job), `focusElement` (default `element.focus()`) acts on it (the app's job: smooth scroll, custom inputs). `handleSubmit` can override both; `node.focus()` uses the form's. Sticky-header offset is left to CSS `scroll-margin-top`.

## Vue adapter (packages/vue/src)

| File               | Role                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reactive-node.ts` | wraps core nodes; one version ref per form, one `computed` per node `state`, so only nodes whose snapshot changed re-render                                            |
| `use-form.ts`      | `createForm` + subscription + `deps` watch (bridge to the core store) + dispose on scope end; never provides                                                           |
| `node-context.ts`  | `provideFormNode(node)` (explicit), `useFormNode(Definition)` (nearest provided node of that definition, throws otherwise), `useFormNode()` (nearest node, loose type) |
| `use-field.ts`     | `useField(name \| node)`: `model` for v-model, `attrs` (null aria values mapped to undefined), `state`, ids                                                            |

Components never receive nodes through props: business components call `useFormNode(Definition)`, generic inputs take a `name`, rows take an `index`.

- Names match the React adapter: `useForm` creates a form, `useFormNode` reads a node from context, `useField` binds an input. Only providing differs, because React provides through a component: `provideFormNode` here, `<FormNodeProvider>` there. `FormNode` avoids confusion with VNodes and DOM nodes.
- The `deps` watch in `use-form.ts` is the package's only `watch`; it writes to an external system (the core store), never to Vue state.
- Scope end drops the subscription and calls `form.dispose()`, which cancels pending async work; the form stays usable.
- `useFormNode(Definition)` matches by definition identity through core's `UniversalNode.definition`.
- `useField` also accepts a node, so a business component can bind v-model to a typed node from `useFormNode`.
- The package re-exports core, so an app depends on one package.
- No `formatError` hook: the app's generic input translates `code` (`apps/docs/vue/field-bindings.md`); a hook would tie the adapter to an i18n library to save one line.

## React adapter (packages/react/src)

| File                | Role                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `use-node-state.ts` | `useNodeState(node)`: `useSyncExternalStore` over the node's `subscribe` and its memoised `state` snapshot                                                                                                                     |
| `use-form.ts`       | `createForm` once per component (`useState` initializer), id from `useId`, `setDeps` in an effect when `deps` changes, `dispose` on unmount; subscribes to the root, never provides                                            |
| `node-context.tsx`  | `<FormNodeProvider node>` (explicit), `useFormNode(Definition)` (nearest node of that definition, subscribes to it, throws otherwise), `useFormNode()` (nearest node, loose type), internal `useNearestNode` (no subscription) |
| `use-field.ts`      | `useField(name \| node)`: `value`, `setValue`, `attrs` (null aria mapped to undefined, `onBlur`), `state`, ids; subscribes to the field only                                                                                   |

- Nodes are the core's own objects: `useSyncExternalStore` needs only the memoised snapshots, so nothing is wrapped.
- A component re-renders only for the nodes it subscribed to: `useForm` the root, `useFormNode` its node, `useField` its field, `useNodeState` any node. Reading another node's `state` without a hook gives the last render's snapshot; `apps/docs/react/index.md` says so, and the playground reads every branch's `active` through `useNodeState`.
- `useField(name)` reads the context through `useNearestNode`, without subscribing to the provided node, so an input does not re-render when a sibling changes.
- `FormNodeProvider` memoises its context value by node and parent and renders `NODE_CONTEXT.Provider`, which keeps React 18.3 working (peer `^18.3.0 || ^19.0.0`).
- Under `StrictMode` effects run twice, so `dispose` runs before the form is used; `dispose` only cancels async work and the form keeps working (tested).
- `value` and `setValue` instead of ready-made input props: only the component knows how its element represents the value (numbers, empty strings, objects from a select).
- Same names as the Vue adapter except the provider; same stance on `formatError`.

## Docs (apps/docs)

VitePress 2 (alpha) site in English, styled after usewagen.dev: `guide/` (core concepts), `vue/` and `react/` (adapters), `examples/` (live Vue demos with "Show code"; React pages use plain `tsx` blocks). Examples are generic (checkout, account roles, segment builder, price cell), and so are the three playgrounds (one checkout wizard); never use search-ads-ui domain terms in docs, playgrounds or tests. Core tests use a store promotion (`packages/core/tests/fixtures/promotion.ts`): reward branches, a gift with a nested branch, spending slots, recursive eligibility rules.

| Path                        | Role                                                                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `examples/forms/*.ts`       | shared definitions and a fake API; used by the demos and, through twoslash `extraFiles`, by guide snippets                                                                                                             |
| `examples/demos/*.vue`      | live demos, embedded in `examples/*.md` inside `<DemoFrame>`                                                                                                                                                           |
| `examples/components/*.vue` | generic `text-field` / `number-field` / `select-field` built on `useField(name)`                                                                                                                                       |
| `.vitepress/config.ts`      | sidebar, twoslash (`ts twoslash` blocks are type-checked at build time), aliases to package sources                                                                                                                    |
| `typedoc.json`              | API reference: TypeDoc + typedoc-plugin-markdown + typedoc-vitepress-theme write `api/` (gitignored) before `dev` and `build`; one page per symbol; the sidebar is read from `api/typedoc-sidebar.json` at config load |

A `ts twoslash` block that does not compile fails the docs build; hide setup lines above `// ---cut---` and import shared definitions from `./forms/<name>`. Use `//    ^?` queries only where the displayed type reads well. Vue templates use `@submit.prevent`.

Docs are plain and leave no open question. They explain concepts, behaviour and reasons, and show them in `ts twoslash` code, which fails the build when the API changes. They never copy what the API reference lists (members, options, defaults) into prose or tables; a sentence links to the reference page instead (`/api/@formtree/core/interfaces/FieldNode`), and a dead link fails the build. No intro that recaps the sidebar and no "Next" section: the sidebar and the pager do that. `guide/index.md` introduces the library through the problems it solves; it describes other libraries generically, without naming them. No page compares formtree to another library or borrows one as a reference point ("like TanStack Table", "the same limit `z.lazy` has"); a library is named only where an example uses it (Zod, vue-i18n, react-i18next).

Names in examples read as plain English: a node variable is named after its key (`const delivery = form.group('delivery')`), a key never repeats an API member (`lineItems`, so the code reads `lineItems.items`, never `items.items`), a function says what it does (`savePrice`, not `commit`), and no name shadows another in the same file. Every identifier a snippet uses is declared or imported, and a snippet shows a use, not a bare expression statement.

## Releases

Changesets 3 (`.changeset/config.json`): `@formtree/*` is a `fixed` group, so every package gets the same version; private `apps/*` are never versioned; `access: public`; `format: false` because the formatter is `vp fmt` (its config lives in `vite.config.ts`, which Changesets cannot detect), so `pnpm version-packages` runs `changeset version && vp fmt`. The repo is in `alpha` pre mode (`.changeset/pre.json`); `changeset pre exit` before the first stable release. A change to a published package's API or behaviour comes with a changeset (`pnpm changeset`); docs, playgrounds and tests do not need one. `pnpm release` runs `vp run ready`, then `changeset publish`.

## Tooling

- Packages use TypeScript 7 (tsgo). `apps/vue-playground` and `apps/docs` pin TypeScript ~5.9: vue-tsc and TypeDoc need the TypeScript JS API, which TS 7 does not have.
- `vp check` does not type-check `.vue` files; builds that contain SFCs run `vue-tsc --noEmit` first.
- Type-only modules are `.ts`, never `.d.ts`: `skipLibCheck` skips every `.d.ts` and would hide their errors.
- Apps resolve package sources through tsconfig `paths` and Vite `resolve.tsconfigPaths`, so dev needs no build, and type checks and runtime see the same file.
- `packages/vue` and `packages/react` pack with `tsconfig.build.json` (no `paths`), so their `.d.ts` imports `@formtree/core` instead of inlining it; `vp run -r build` packs core first.
- React files are `.tsx` with `jsx: react-jsx`; `vp check` type-checks them, so the React playground builds with plain `vp build`. Tests use `@testing-library/react` in happy-dom and call `cleanup` in `afterEach`. `apps/docs/tsconfig.typedoc.json` sets `jsx` for TypeDoc.
- Type tests live in `*.test-d.ts` (Vitest typecheck). Confirm a new type test fails without the change it covers.

## Open work

- Hover types are hard to read: nested drafts and outputs show as `Simplify<DraftObject<…> & {} & {…}>`, group nodes as `GroupNode<GroupDefinitionOf<…>>`. Until that is fixed, docs use `//    ^?` only where the type reads well.
- Playgrounds and docs demos have only been checked with scripted headless Chrome flows; the React playground only for a clean first render, since the repo has no browser driver.
- Once the repo has a GitHub remote: drop `disableSources` in `apps/docs/typedoc.json` and consider `@changesets/changelog-github`.

## Code conventions

Same conventions as search-ads-ui `src-new`:

- No comments; names and structure carry the meaning. The one exception is JSDoc on the public API (what a package `src/index.ts` exports), kept short:
  - `@category` on every export (Definitions, Form, Nodes, Validation, Submitting, Errors, Types; adapters: Form, Node Context, Node State (React), Field Bindings); it drives the API sidebar.
  - A one or two sentence summary only where the name and type do not say it; behaviour that surprises (throws, skips, keeps values) goes there.
  - `@defaultValue` on options that have one; no `@param`, `@returns` or `@example` (examples live in the guide).
  - `@internal` on adapter plumbing (`UniversalNode`, `LensShape`, phantom `~options` / `~types`); TypeDoc hides it, `.d.ts` keeps it.
  - `@module` on each `index.ts`. TypeDoc treats validation warnings as errors, so a broken `{@link}` or an unexported type in a public signature fails the docs build.
- `function` declarations, never arrow-function constants; object parameters once arguments stop being obvious.
- `interface` for object shapes, `Array<T>` syntax, no `any`.
- Loose equality (`==`, `!=`) unless identity matters (`Object.is`).
- Per-kind behaviour lives in exhaustive tables (`DefinitionHandlers`, `ARRAY_EDITORS`, `MODE_POLICIES`), not `kind == 'x'` branches.
- String domain values are `as const` objects with a derived type (`ASYNC_TRIGGER`, `CLEAR_ON`, `SUBMIT_OUTCOME`).
- Definitions are values, not components: camelCase with a kind suffix (`emailField` from `defineField*`, `deliveryGroup` from `defineGroup*`, `Array` for a stored `arrayOf`). PascalCase stays for types, interfaces and components. React components live in kebab-case `.tsx` files with named exports.
- Constants used by one file stay in that file; only `src/index.ts` re-exports.
- Extensionless relative imports (bundler resolution).

## Commands

```sh
pnpm exec vp run ready        # check + tests (runtime and types) + pack + playground and docs builds
pnpm exec vp test             # inside packages/core
pnpm exec vp run playground#dev
pnpm exec vp run vue-playground#dev
pnpm exec vp run react-playground#dev
pnpm exec vp run docs#dev
```

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
