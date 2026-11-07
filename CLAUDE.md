# formtree

Headless form tree. `packages/core` is the framework-free engine, `packages/vue` and `packages/react` the adapters. `apps/playground` drives the core with plain DOM code; `apps/vue-playground` and `apps/react-playground` build the same wizard with Vue SFCs and React components. The docs guide is the spec: `apps/docs/guide/design-rules.md` holds the ten design rules and what formtree leaves out on purpose, `apps/docs/guide/how-it-works.md` the model. The decisions below record why the code has its shape; add new ones here.

The contributor workflow lives in @CONTRIBUTING.md. This file keeps only what the code, config and git history do not show: the architecture at a glance, the conventions review holds code and docs to, decisions with their reasons and guarding tests, and gotchas. A path, name or value that the code already shows stays out.

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
- `validate` (group, array) runs on the draft in the same step as the schema, whether or not the schema passes; neither reads the other's result. A rule that waited would repeat a schema refinement's flaw (Zod skips it while any key is `undefined` or of the wrong type, so in a form it waits for every key to be filled in), and an output exists only once the whole subtree is valid. The cost: rules check for `undefined` and see untransformed values. Guarded by "a group validate rule runs on the draft while the schema fails" in `validation.test.ts`.
- `validateAsync` runs last, on the output, and is held while a schema or rule error targets its node or a node below it, whichever node produced it (`isSyncSettledAndValid` filters by `targetId`, not `ownerId`). A request costs a round trip and asks about the value that would be saved; a sync rule costs nothing, so it never waits. Guarded by "a check waits while a parent rule puts an error on its node" in `async-validation.test.ts`.
- A schema default never fills the draft; it reaches only the output, through the schema run that validates the value, so the handler and `validateAsync` receive it and a group `validate` sees `undefined`. Standard Schema cannot be asked for its defaults, and a filled draft would make "left empty" look like "chosen" and move the baseline `dirty` and `reset` measure from. A value the user should see goes into `initialValue`. `guide/fields.md` ("Starting values and schema defaults") explains it. Guarded by "a schema default fills the output, never the draft" in `submit.test.ts`.
- One runtime object per node id (`UniversalNode`); field, group and array nodes are views in types only, so `form.field('x') === form.group('x')` and adapters can key on nodes. An undeclared node reports `kind: 'lens'`, since that object cannot know which accessor returned it.
- Node interface methods are function-typed properties: destructuring is safe (no unbound-method) and nodes stay invariant.
- A write to a missing index or a removed row is ignored: no throw, state unchanged.
- An annotated recursive definition navigates its children as lens nodes, and its output is the annotated type; TypeScript cannot infer the child types of a self-referencing constant. At runtime those nodes are still defined and validated.
- `FormError.code` is the message the schema reports, a readable text or a translation key; the schema library's own issue code lands in `params.code`. The name stays: the UI translates `code` at render time, and `params` carries the issue values for interpolation.
- Every node carries an internal `subscribe` (the form's), so an adapter that holds only a node can follow it; React's `useNodeState` uses it.
- `setDeps` with dependencies equal key by key to the current ones does nothing. React passes a new `deps` object on every render, and a notification there would loop.
- `handleSubmit` handlers receive only the output, no `{ node }` context; the caller already holds the node. Add it when a real need appears.
- Focus has two options: `shouldFocusError` picks the target (DOM order, summary rule; the core's job), `focusElement` (default `element.focus()`) acts on it (the app's job: smooth scroll, custom inputs). `handleSubmit` can override both; `node.focus()` uses the form's. Sticky-header offset is left to CSS `scroll-margin-top`.
- Errors become text in one place: `formatError` (a `FormDefaults` option, default `error => error.code`) feeds every node's `errorMessage` (first visible error) and `form.formatError` (for summaries). The core still writes no message; the app's function does. `errorMessage` is a getter, never part of the memoised `state` snapshot, so a formatter that reads the current language (vue-i18n's locale ref) is re-run where the message is read.
- `FormDefaults` (`mode`, `reValidateMode`, `shouldFocusError`, `focusElement`, `formatError`) are the options an app sets once; the adapters take them app-wide (`createFormtree`, `FormtreeProvider`). An option given to `useForm` wins, and an explicit `undefined` falls back to the default, as `??` does in `createForm`.
- `form/form-events.ts` emits `FormEvent`s (`@internal`) for devtools through `UniversalNode.observe`: change, blur, reset, deps, errors, check start / end / abort, submit start / end. Operations emit after they commit, so an observer reads the new state; a cached check result and an aborted check are emitted during the validation pass, before the commit of the change that caused them. A `'skipped'` submit and a check result are emitted although no state may change, which is why events are separate from `subscribe`. With no observer, an emit is one size check; behaviour never depends on events.

## Vue adapter (packages/vue/src)

| File                 | Role                                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reactive-node.ts`   | wraps core nodes; one version ref per form, one `computed` per node `state`, so only nodes whose snapshot changed re-render                                            |
| `use-form.ts`        | `createForm` + subscription + `deps` watch (bridge to the core store) + dispose on scope end; never provides                                                           |
| `node-context.ts`    | `provideFormNode(node)` (explicit), `useFormNode(Definition)` (nearest provided node of that definition, throws otherwise), `useFormNode()` (nearest node, loose type) |
| `use-field.ts`       | `useField(name \| node)`: `model` for v-model, `attrs` (null aria values mapped to undefined), `state`, ids                                                            |
| `create-formtree.ts` | `createFormtree(options)`: the app plugin; provides `FormDefaults` and, unless `devtools: false` or a production build, connects the devtools                          |
| `formtree-app.ts`    | `FORMTREE_APP` injection key (defaults + devtools registry); `useForm` reads it and registers its form, labelled with the creating component's name                    |
| `devtools/`          | `connectDevtools(app)`: a read-only inspector (node tree, node state) and a timeline layer; returns the registry forms register with                                   |

- Names match the React adapter: `useForm` creates a form, `useFormNode` reads a node from context, `useField` binds an input. Only providing differs, because React provides through a component: `provideFormNode` here, `<FormNodeProvider>` there. `FormNode` avoids confusion with VNodes and DOM nodes.
- The `deps` watch in `use-form.ts` is the package's only `watch`; it writes to an external system (the core store), never to Vue state.
- Scope end drops the subscription and calls `form.dispose()`, which cancels pending async work; the form stays usable.
- `useFormNode(Definition)` matches by definition identity through core's `UniversalNode.definition`.
- `useField` also accepts a node, so a business component can bind v-model to a typed node from `useFormNode`.
- The package re-exports core, so an app depends on one package.
- `formatError` is the app's function, given once to `createFormtree`; the adapter calls it and knows no i18n library. Generic inputs show `field.errorMessage`.
- Devtools are Vue only (React DevTools has no plugin API) and read-only: an edit from the devtools would be a write path outside the error producers of rule 4. They are on by default through `createFormtree` and off with `devtools: false`.
- Production builds drop the devtools. The code runs behind `process.env.NODE_ENV != 'production'`, declared locally in `create-formtree.ts` so no Node types leak into the `.d.ts`, and `sideEffects: false` here and in `@vue/devtools-api` / `@vue/devtools-kit` lets bundlers remove it.
- `@vue/devtools-api` is a required peer, as in Pinia 4, because the main entry imports it: an optional peer would break resolution when it is missing, and a dependency would fix the version for the app. Plugin types are derived from `setupDevtoolsPlugin`, since `@vue/devtools-kit`, which declares them, is not a direct dependency.
- `useForm` reads the registry with `hasInjectionContext()` first, so a form in a bare `effectScope` (tests) neither registers nor warns.
- The inspector lists declared children in definition order, then schema keys that have a value or an error, sorted; a schema cannot be asked for its keys.
- The Vue Devtools v8 sidebar shows only the descriptor's `logo` and accepts an `http(s)` or `/` URL or a bundled `custom-ic-baseline-*` name, not a data URI, so `logo` names the bundled `dynamic_form` icon.
- No console warnings for misuse (such as an `initialValue` that changes after `useForm`); pitfalls go in the docs, and runtime visibility comes from the devtools.

## React adapter (packages/react/src)

| File                    | Role                                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `use-node-state.ts`     | `useNodeState(node)`: `useSyncExternalStore` over the node's `subscribe` and its memoised `state` snapshot                                                                                                                     |
| `use-form.ts`           | `createForm` once per component (`useState` initializer), id from `useId`, `setDeps` in an effect when `deps` changes, `dispose` on unmount; subscribes to the root, never provides                                            |
| `node-context.tsx`      | `<FormNodeProvider node>` (explicit), `useFormNode(Definition)` (nearest node of that definition, subscribes to it, throws otherwise), `useFormNode()` (nearest node, loose type), internal `useNearestNode` (no subscription) |
| `use-field.ts`          | `useField(name \| node)`: `value`, `setValue`, `attrs` (null aria mapped to undefined, `onBlur`), `state`, `errorMessage`, ids; subscribes to the field only                                                                   |
| `formtree-provider.tsx` | `<FormtreeProvider>`: `FormDefaults` for every `useForm` below it, read once when a form is created                                                                                                                            |

- Nodes are the core's own objects: `useSyncExternalStore` needs only the memoised snapshots, so nothing is wrapped.
- A component re-renders only for the nodes it subscribed to: `useForm` the root, `useFormNode` its node, `useField` its field, `useNodeState` any node. Reading another node's `state` without a hook gives the last render's snapshot; `apps/docs/react/index.md` says so, and the playground reads every branch's `active` through `useNodeState`.
- `useField(name)` reads the context through `useNearestNode`, without subscribing to the provided node, so an input does not re-render when a sibling changes.
- `FormNodeProvider` memoises its context value by node and parent and renders `NODE_CONTEXT.Provider`, which keeps React 18.3 working (peer `^18.3.0 || ^19.0.0`).
- Under `StrictMode` effects run twice, so `dispose` runs before the form is used; `dispose` only cancels async work and the form keeps working (tested).
- `value` and `setValue` instead of ready-made input props: only the component knows how its element represents the value (numbers, empty strings, objects from a select).
- Same names as the Vue adapter except the providers (`<FormNodeProvider>`, `<FormtreeProvider>` where Vue has `provideFormNode`, `createFormtree`). `errorMessage` is computed on render, so a language switch shows only in components that re-render; the docs have the generic input call `useTranslation()`.

## Code conventions

- No comments. Names and structure carry the meaning.
- The one exception is short JSDoc on the public API, which is what each package exports from its entry.
  - Every export has a `@category`, which groups the API reference.
  - A summary goes only where the name and type do not say it. Behaviour that surprises, such as throwing, skipping or keeping values, goes there.
  - An option with a default has a `@defaultValue`. There is no `@param`, `@returns` or `@example`, because examples live in the guide.
  - Plumbing that only the adapters use is `@internal`.
- Functions take an object parameter once their arguments stop being obvious.
- Loose equality (`==`, `!=`) unless identity matters (`Object.is`).
- Behaviour that differs per kind lives in an exhaustive table, not in `kind == 'x'` branches.
- String domain values are `as const` objects with a derived type.
- Definitions are values, not components. They are camelCase with a kind suffix, such as `emailField`, `deliveryGroup` or `lineItemsArray`. PascalCase stays for types, interfaces and components.
- Components never receive nodes through props. A business component reads its node with `useFormNode(Definition)`, a generic input takes a `name` and a row takes an `index`.
- React components live in kebab-case `.tsx` files with named exports.
- A constant used by one file stays in that file. Only a package's entry re-exports.
- Relative imports have no extension.
- Type-only modules are `.ts`, never `.d.ts`, since `skipLibCheck` would hide their errors.

## Docs (apps/docs)

VitePress 2 (alpha) site in English, styled after usewagen.dev: `guide/` (core concepts), `vue/` and `react/` (adapters), `examples/` (live Vue demos, each followed by every file it uses in a code group; React pages use plain `tsx` blocks). Never use search-ads-ui domain terms in docs, playgrounds or tests.

| Path                        | Role                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `examples/forms/*.ts`       | definitions, one file per part (`contact`, `delivery`, `payment`, `line-items`, `promo-code`, composed in `checkout`), and a fake API; used by the demos and, through twoslash `extraFiles`, by guide snippets (`./forms/<name>`); a new file goes into `EXAMPLE_FORMS` in `.vitepress/config.ts` |
| `examples/demos/*.vue`      | live demos, embedded in `examples/*.md` inside `<DemoFrame>`                                                                                                                                                                                                                                      |
| `examples/components/*.vue` | generic `text-field` / `number-field` / `select-field` built on `useField(name)`                                                                                                                                                                                                                  |
| `.vitepress/config.ts`      | sidebar, twoslash (`ts twoslash` blocks are type-checked at build time), aliases to package sources                                                                                                                                                                                               |
| `typedoc.json`              | API reference: TypeDoc + typedoc-plugin-markdown + typedoc-vitepress-theme write `api/` (gitignored) before `dev` and `build`; one page per symbol, linked to its source on GitHub at the built commit (`sourceLinkTemplate`); the sidebar is read from `api/typedoc-sidebar.json` at config load |

The site is deployed on Netlify at https://form-tree.netlify.app. `og:image` is that site's absolute URL, since most link previews ignore a relative one. `public/og-image.png` is rendered from `.vitepress/og-image.html` at 1200×630 with headless Chrome (`--window-size=1200,630 --force-device-scale-factor=1 --allow-file-access-from-files --screenshot`).

`guide/how-it-works.md` and `guide/groups.md` state that a schema key is not a child, and the `children` JSDoc repeats it. The option keeps its name: it pairs with `childDeps`, and nesting definitions as `children` matches route trees.

Writing:

- Docs are plain and leave no open question. They explain concepts, behaviour and reasons, and show them in code.
- Every sentence earns its place. A page does not restate what the code just showed, has no asides, no intro that recaps the sidebar and no "Next" section.
- Prose has few colons. A sentence that leads into code or a list ends with a period, and an "X: Y" clause becomes two sentences, a "because" or "so" clause, or a comma.
- The guide never copies what the API reference lists, such as members, options or defaults. It links to the reference instead.
- No page compares formtree to another library or borrows one as a reference point. A library is named only where an example uses it.
- A child is always an entry of a group's `children`, a node with a definition of its own. A key of a schema is a node too, but prose calls it a key or a lens node, never a child.

Code blocks:

- Code blocks are type-checked with twoslash. Setup lines go above `// ---cut---`, and shared definitions are imported rather than repeated.
- Type queries (`//    ^?`) go only where the displayed type reads well.
- Hovers add to the page size, so a block whose hovers add nothing starts with `// @noStaticSemanticInfo`. It keeps the type check and drops the hovers.
- Vue templates use `@submit.prevent`.

Examples:

- Examples, playgrounds and tests use everyday domains, such as a checkout or account roles.
- An example page shows the demo, a few sentences on what to try, then every local file the demo imports, entry component first, so a reader never meets an import they cannot open.
- Example forms are split by part, so each example shows only the files it uses.
- Names read as plain English. A node variable is named after its key (`const delivery = form.group('delivery')`), a key never repeats an API member (`lineItems`, so the code reads `lineItems.items`, never `items.items`), a function says what it does (`savePrice`, not `commit`), and no name shadows another in the same file.
- Every identifier a snippet uses is declared or imported, and a snippet shows a use, not a bare expression statement.

## Releases

- Maintainers write the changesets, on a contributor's PR too, for any change to a published package's API or behaviour; docs, playgrounds and tests need none. `@formtree/*` is a `fixed` group, so every package shares one version.
- The Changesets config has `format: false` because the formatter is `vp fmt`, configured in `vite.config.ts` where Changesets cannot find it; `pnpm version-packages` runs `changeset version && vp fmt`.
- The changelog reads GitHub, so a local `pnpm version-packages` needs `GITHUB_TOKEN=$(gh auth token)`.
- A prerelease starts with `pnpm changeset pre enter <tag>` and ends with `pnpm changeset pre exit`. The stable changelog is built from `.changeset/pre/`, so trim those files to what matters for the stable version first.
- The CI job is named `ci` because the `main` ruleset requires a check with that name; a rename blocks every merge without bypass.
- npm auth is trusted publishing (OIDC), no token: each `@formtree/*` package trusts `tinas/formtree` and `release.yml`. Only the `publish` job has `id-token: write`.
- pnpm adds provenance on its own for a public repo, and provenance fails unless the package's `repository` (with `directory`) matches the repo; every package declares it.
- npm lets a package trust a workflow only once it exists: a new package is published once by hand (`pnpm release`), then `npm trust github <name> --file release.yml --repo tinas/formtree --allow-publish`, or the same on the package's Trusted Publisher settings with no environment and "Allow npm publish" ticked. Without that permission npm allows only staged publishes, and `publish` fails with `E403 OIDC permission denied for this action`.
- The version PR is opened with the Actions token, so GitHub holds CI on it until it is approved ("Approve and run workflows"); `pack` runs `vp run ready` before anything is published either way.
- `changeset-status.yml` runs on `pull_request_target` so fork PRs get the comment; it checks out and reads, never runs the PR's code.
- Actions are pinned to commit SHAs with the tag in a comment; Dependabot groups their updates monthly. `setup-vp` takes Node from `engines.node` (the newest release in the range), Vite+ from the catalog and pnpm from `devEngines`.

## Tooling

- Packages use TypeScript 7 (tsgo). `apps/vue-playground` and `apps/docs` pin TypeScript ~5.9: vue-tsc and TypeDoc need the TypeScript JS API, which TS 7 does not have.
- `vp check` does not type-check `.vue` files; builds that contain SFCs run `vue-tsc --noEmit` first.
- Apps resolve package sources through tsconfig `paths` and Vite `resolve.tsconfigPaths`, so dev needs no build, and type checks and runtime see the same file.
- `packages/vue` and `packages/react` pack with `tsconfig.build.json` (no `paths`), so their `.d.ts` imports `@formtree/core` instead of inlining it; `vp run -r build` packs core first.
- React files are `.tsx` with `jsx: react-jsx`; `vp check` type-checks them, so the React playground builds with plain `vp build`. Tests use `@testing-library/react` in happy-dom and call `cleanup` in `afterEach`. `apps/docs/tsconfig.typedoc.json` sets `jsx` for TypeDoc.

## Open work

- Hover types are hard to read: nested drafts and outputs show as `Simplify<DraftObject<…> & {} & {…}>`, group nodes as `GroupNode<GroupDefinitionOf<…>>`. Until that is fixed, docs use `//    ^?` only where the type reads well.
- Playgrounds and docs demos have only been checked with scripted headless Chrome flows; the React playground only for a clean first render, since the repo has no browser driver.
- Point the devtools `logo` at the docs site's logo (https://form-tree.netlify.app/logo.svg) instead of the bundled `dynamic_form` icon.

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
