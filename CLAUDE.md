# formtree

Headless form tree. `packages/core` is the framework-agnostic engine, `packages/vue` and `packages/react` the adapters. `apps/playground` drives the core with plain DOM code; `apps/vue-playground` and `apps/react-playground` build the same wizard with Vue SFCs and React components. The design rules below are the spec, and the docs guide teaches each one where its behaviour is used. The decisions below record why the code has its shape; add new ones here.

The contributor workflow lives in @CONTRIBUTING.md. This file keeps only what the code, config and git history do not show: the architecture at a glance, the conventions review holds code and docs to, decisions with their reasons and guarding tests, and gotchas. A path, name or value that the code already shows stays out.

## Design rules

1. State does not depend on rendering. Mounting or unmounting a component never changes a value, an error or a registration.
2. Types come from schemas, not values. A form holds `DraftOf<definition>` and a handler receives `OutputOf<definition>`; an initial value fits the draft and need not be complete.
3. A node is found by identity, by its path or, in an adapter, by its definition. There is no "nearest form" lookup.
4. Every error has one producer (schema, `validate`, `validateAsync` or the server), and each changes only its own errors.
5. Validation runs on every change; `mode` only decides visibility.
6. An inactive branch is not validated and is not in the output, but its value is kept.
7. Empty is `undefined`, structure always exists. Declared groups are `{}` and declared arrays `[]` from the start, and the library invents no other value, so `push({})` adds an empty row.
8. An array item is identified by its key, not its index.
9. A submit runs a fixed pipeline; a node already submitting or in an inactive branch returns `'skipped'`.
10. Dependencies flow down, explicitly: parent to child, never between siblings or upwards.

Left out on purpose: components, renderless fields and directives (elements belong to the app); `canSubmit` (an invalid form keeps its button enabled, edit forms gate on `dirty`); unregistering on unmount (rule 1); `null` for empty and drafts filled from schema defaults (rule 7); adapters per schema library (Standard Schema only); wildcard paths for async rules (a check belongs to its definition); dependencies between siblings (rule 10); built-in messages (`formatError` turns codes into text); persistence and unsaved-changes prompts (`subscribe` and `dirty` are enough); a `watch` API (`subscribe`, `node.state` and the framework's own watch); narrowing the output by the answer that turns a part on (a getter's `boolean` does not tell the types which answer, and patterns, key helpers or predicates inferred from a helper in the getter's context each add a form or type machinery to maintain, so a part `activeWhen` turns on stays optional and the submit function checks it).

## Architecture (packages/core/src)

| Folder         | Role                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `definitions/` | `defineField`, `defineGroup`, `arrayOf` (+ `WithDeps` variants), type-level `DraftOf` / `InputOf` / `OutputOf` / `DepsOf`, erased runtime options         |
| `state/`       | `FormState` and pure transitions (value writes, resets, array edits, errors, check states, submit flags); array items are addressed by key-based node ids |
| `validation/`  | scope walk, sync schema/validate runs, output composition, async checks, display-mode visibility                                                          |
| `nodes/`       | public node types, path navigation types, the universal runtime node object                                                                               |
| `form/`        | `createForm`, the runtime holder, operations that commit state, submit pipeline, focus                                                                    |

State is immutable; every mutation goes through a pure transition and then `commitWithValidation` / `commitState`. Side effects (timers, abort controllers, schema promises) live only in `validation/async-validation.ts` and `validation/validation-pass.ts`.

### Core decisions

- Definitions carry a phantom `'~types'` and an erased `'~options'`. Definition types stay covariant, so an annotated recursive definition type-checks, and runtime options are read behind one cast.
- `AnyArrayDefinition` is a non-generic interface. A generic one made `Definition` compute itself, and `createForm`'s constraint failed with TS2589.
- `activeWhen` keys are inferred as their own mapped type parameter (`ActiveKeys`). With the whole object as one type parameter, the callbacks lose contextual typing and `value` is implicitly `any`.
- `defineGroup*` return `NoInfer<Children>` and `NoInfer<ActiveKeys>`. Without it, an inline nested `defineGroup({ schema })` inferred `Record<string, Definition>` children from the outer call and demanded `childDeps`.
- In the draft, field children are optional keys; declared groups and arrays are required and built by `createForm` (rule 7).
- A value is structure only when it is a plain object (prototype `Object` or `null`) or an array. Paths, array keys and `deepEqual` walk nothing else, so any other object, such as a `File`, a `Map`, a Temporal date or a class instance, is a value of its own and compares by identity, a `Date` by its time. A `File` or a `Map` has no own enumerable keys, and walking them made any two of a kind equal, so choosing another file left a field clean. Where the definition expects a group (the draft and a group schema's output), an object of another class becomes a plain object of its own values, so an `initialValue` built from a class keeps them. The copy keeps own values only, so getters and methods on the prototype are lost and writing the same instance again is a new write, not a no-op; a group holds data, and an app that needs the class builds it in its submit handler. A check finds a cached answer by comparing outputs with `deepEqual`, never by a string of the output, which turned every `File` into `{}` and threw on a `bigint`. The core exports the rule as `isPlainObject` and the one-level comparison built on it as `shallowEqual`, and the adapters import them (the Vue inspector, React's selector memo) instead of keeping copies that drift; utilities like these belong in the public API, not in an internal entry. happy-dom's `File` has own `name`, `type` and `lastModified` keys, unlike a browser's, so the file tests pick files that share all three. Guarded by "a field holding a file or a map is dirty once another one is chosen" and "a class instance where a group is expected keeps its values" in `create-form.test.ts`, "a group schema that returns a class instance keeps its values in the output" in `submit.test.ts`, and "a check runs again for every different file, even one with the same name" and "a check accepts a bigint value" in `async-validation.test.ts`, and "lists no keys below a value that is not a plain object" in the Vue `devtools.test.ts`.
- Every read by a key that comes from a path, a definition or a value is an own-property read (`ownValue`). A key named like an `Object` member, such as `constructor`, is an ordinary key, and a value on a polluted `Object.prototype` never reaches the draft, a definition lookup or a rule; `children[segment]` used to hand `Object` to `definitionAt`, and `form.field('constructor')` threw. A path through `__proto__` has no position (`toPath` returns `undefined`), so it reads `undefined` and a write to it is ignored, like one to a removed row. Writing it would give the draft an own `__proto__` key, and an app that copies the output with `Object.assign` would set the copy's prototype. Only `__proto__` is refused. `constructor` and `prototype` stay ordinary keys, since copying them changes no prototype and only a deep merge that follows inherited keys could turn `constructor.prototype` into pollution, while refusing them would forbid real field names. Values are not sanitised either. An own `__proto__` key in data the app passes in, such as a parsed response in `initialValue`, stays data, because dropping keys would change the app's data. Guarded by "a path through the prototype key reaches no value and ignores writes", "a key named like an Object member is an ordinary key" and "values on a polluted Object.prototype never reach the form" in `create-form.test.ts`.
- Node ids are key-based (`cart.items.[k3].quantity`); paths shown to users use indexes. Errors, touched state and submit counts hang off the id, so a moved row needs no remapping (rule 8). The baseline tree keeps its own array keys, so rows rebaseline independently; a saved new row enters the baseline after its previous sibling.
- A validation pass is a scope walk, then sync runs memoised by value and deps reference, then async reconciliation. Deps are pinned by shallow equality, so a `childDeps` that returns a new object or array with the same content does not rebuild the schema.
- `validate` (group, array) runs on the draft in the same step as the schema, whether or not the schema passes; neither reads the other's result. A rule that waited would repeat a schema refinement's flaw (Zod skips it while any key is `undefined` or of the wrong type, so in a form it waits for every key to be filled in), and an output exists only once the whole subtree is valid. The cost: rules check for `undefined` and see untransformed values. Guarded by "a group validate rule runs on the draft while the schema fails" in `validation.test.ts`.
- `validateAsync` runs last, on the output, and is held while a schema or rule error targets its node or a node below it, whichever node produced it (`isSyncSettledAndValid` filters by `targetId`, not `ownerId`). A request costs a round trip and asks about the value that would be saved; a sync rule costs nothing, so it never waits. Guarded by "a check waits while a parent rule puts an error on its node" in `async-validation.test.ts`.
- A check has three outcomes: no errors, errors, or no answer when `run` throws. What a check shows lives in one place, `FormState.checks` (owner id to `pending` or `failed` with the thrown value); `NodeState.validating` and `failedChecks` are derived from it, and each transition in `state/check-transitions.ts` writes it once. `CheckEntry.status` holds only the run lifecycle (timers, abort, the answer cache) and is never read for display. A run is current until its signal is aborted: every path that supersedes a run (a new value, a restart, pruning, reset, dispose) aborts it, so a late answer or failure is dropped by `signal.aborted` and no separate token exists. A failed check is not an error: the value may be right, so the input is not `aria-invalid`, `errorMessage` and `formatError` never see it and `mode` does not hide it; `valid` is false while one exists. Failures are not cached. A failed check runs again on its next trigger and on every `validate()` and submit, which mark failed checks `stale` before their pass; a run settles `idle`, failed or not, because the settle loop restarts every `stale` check and would otherwise retry a failing check within the same call. A submit with errors is `'invalid'`, one whose check fails again `'unchecked'`; both focus a failed check's node like an error. Retries and backoff belong to the request inside `run`, so there is no retry option. Guarded by "a failed check is listed in failedChecks, not as an error", "a submit runs a failed check again and is unchecked while it still fails" and "a failure from a run that a newer value replaced is ignored" in `async-validation.test.ts`.
- `ignoreCache` (`validate`, `handleSubmit`) marks cached results `stale` before the pass, then the normal pipeline runs (`settleValidationWithin` in `validation-pass.ts`, so `form/` never touches entries). Sync entries of the node, its subtree and its ancestors are marked, since an ancestor's schema or rule covers a schema key; they are kept, not deleted, so their tokens keep rising and a schema run started before is still rejected. Settled checks in the subtree become `stale` and lose the cached answer for their current value, which a check under an asynchronous schema would otherwise read once the schema settles. Guarded by "ignoreCache on a schema key runs the schema and rules that cover it again" and "ignoreCache ignores the schema run it replaced" in `validation.test.ts` and "ignoreCache asks again when the schema of the checked value is asynchronous" in `async-validation.test.ts`.
- A schema default never fills the draft; it reaches only the output, through the schema run that validates the value, so the handler and `validateAsync` receive it and a group `validate` sees `undefined`. Standard Schema cannot be asked for its defaults, and a filled draft would make "left empty" look like "chosen" and move the baseline `dirty` and `reset` measure from. A value the user should see goes into `initialValue`. `guide/initial-values.md` explains it. Guarded by "a schema default fills the output, never the draft" in `submit.test.ts`.
- A node is a view, not the owner of its data. Values, errors and flags live in the one immutable `FormState`, because rules cross nodes (a group schema writes errors on its descendants, `activeWhen` reads a parent's value, a submit makes the errors below it visible), a change commits as one step, and a schema key becomes a node object only when something asks for it.
- One runtime object per node id (`UniversalNode`); field, group and array nodes are views in types only, so `form.field('x') === form.group('x')` and adapters can key on nodes. An undeclared node reports `kind: 'lens'`, since that object cannot know which accessor returned it.
- A node caches its own reads and keeps their reference until their content changes, because the adapters compare by identity (Vue's `computed`, React's `useSyncExternalStore`). `state` and `attributes` are computed once per form version and keep the previous object while every member is the same reference (`shallowEqual`), so a new member needs no equality code; `items` is cached by the array's keys. Dropping a detached node drops its caches. The derived lists `errors` and `failedChecks` are rebuilt on each read, so they keep the previous array while their records are equal (`keepIfSame`); a list that skipped this would re-render on every change, never go stale. `value` and `initialValue` compare by reference on purpose, since a snapshot must hold the form's current value and not an equal copy. Records compare their members by reference (`shallowEqual`), not with `deepEqual`, so a new `params` object or thrown value with the same content costs a render, never a record that keeps an earlier one. `listErrors` is cached the same way, once per `listErrorsKey`, so options with the same meaning (`{}` and `{ deep: false }`) share a list, and keeps the previous array while its records are equal. Guarded by "node state keeps its reference while nothing about the node changes", "node state with visible errors keeps its reference while another node changes", "attributes keep their reference while no attribute changes" and "an error list keeps its reference while the listed errors stay the same" and "error lists are kept per meaning of their options" in `create-form.test.ts`, and "the item list keeps its reference until the keys change" in `arrays.test.ts`.
- Node interface methods are function-typed properties: destructuring is safe (no unbound-method) and nodes stay invariant.
- A write to a missing index or a removed row is ignored: no throw, state unchanged.
- An annotated recursive definition navigates its children as lens nodes, and its output is the annotated type; TypeScript cannot infer the child types of a self-referencing constant. At runtime those nodes are still defined and validated.
- `FormError.code` is the message the schema reports, a readable text or a translation key; the schema library's own issue code lands in `params.code`. The name stays: the UI translates `code` at render time, and `params` carries the issue values for interpolation.
- Every node carries an internal `subscribeToForm` (every change in the form) and `version` (the form's commit count), so an adapter that holds only a node can follow everything a reader may read: React's `useNodeState`, whose selectors may read across nodes, subscribes with the one and uses the other as its snapshot.
- A node's `subscribe` runs only when its `state` or path changes, compared by reference with the reads it last saw, so a binding renders only its own node. The form's runs after every change, because a summary or a save reads across nodes, and the root object cannot carry both meanings. A group's `state` does not follow everything below it: a field's error that becomes visible without changing the group's value, `valid` or `touched` leaves the group's `subscribe` silent, so a part shows its fields through their own subscriptions. Guarded by "a node subscriber is notified only when that node changes, once per batch" in `create-form.test.ts` and "a field subscriber is notified when its row moves" in `arrays.test.ts`.
- `setDeps` with dependencies equal key by key to the current ones does nothing. React passes a new `deps` object on every render, and a notification there would loop.
- `handleSubmit` handlers receive only the output, no `{ node }` context; the caller already holds the node. Add it when a real need appears.
- The function `handleSubmit` returns takes no event and never calls `preventDefault()`. The app prevents the form's default itself (`@submit.prevent`, `event.preventDefault()`), because a hidden `preventDefault` is behaviour the code binding the event does not show.
- Focus has two options: `shouldFocusError` picks the target (the first element shown on the page with an error or a failed check, in document order, or the summary; the core's job), `focusElement` (default `element.focus()`) acts on it (the app's job: smooth scroll, custom inputs). Focus moves once the submit has settled every check and `onInvalid` (awaited) has run, so the page is settled and the DOM knows the order and what is hidden (`checkVisibility`). A field in a closed dialog is opened in `onInvalid`, by the component that owns the dialog's state, since the field may not even be rendered yet. `handleSubmit` can override both; `node.focus()` uses the form's. Sticky-header offset is left to CSS `scroll-margin-top`. Guarded by "the first invalid field on the page receives focus", "focus skips an error whose element is hidden, such as one in a closed dialog", "onInvalid can open the dialog a field is in before focus moves", "focus waits for onInvalid, so a field it renders can receive focus" and "focus moves once every check has answered, so a slow check above a sync error gets it" in `submit.test.ts`.
- Errors are listed in definition order: by the node that produced them (a node before the nodes declared below it, `children` in declared order, rows in list order), a field's errors kept together where its first one falls, and within one node schema, `validate` and checks before external errors, each in the order it returned them. A schema's errors keep the order the schema reports them in, the only order of schema keys a Standard Schema reveals. Path order listed `email` before `name`; DOM order would make a cached read depend on rendering (stale after a step switch, wrong before a new row mounts, missing on the server). `listErrors`, `state.errors` and `onInvalid` share it; focus follows the page, and the two agree in a form laid out as it is defined. Guarded by the tests in `error-order.test.ts`.
- Errors become text in one place: `formatError` (a `FormDefaults` option, default `error => error.code`) feeds every node's `errorMessage` (first visible error) and `form.formatError` (for summaries). The core still writes no message; the app's function does. `errorMessage` is a getter, never part of the memoised `state` snapshot, so a formatter that reads the current language (vue-i18n's locale ref) is re-run where the message is read.
- `FormDefaults` (`mode`, `reValidateMode`, `shouldFocusError`, `focusElement`, `formatError`) are the options an app sets once; the adapters take them app-wide (`createFormtree`, `FormtreeProvider`). An option given to `useForm` wins, and an explicit `undefined` falls back to the default, as `??` does in `createForm`.
- `form/form-events.ts` emits `FormEvent`s (`@internal`) for devtools through `UniversalNode.observe`: change, blur, reset, deps, errors, check start / end / fail / abort, submit start / end. Operations emit after they commit, so an observer reads the new state; a cached check result and an aborted check are emitted during the validation pass, before the commit of the change that caused them. A `'skipped'` submit and a check result are emitted although no state may change, which is why events are separate from `subscribe`. With no observer, an emit is one size check; behaviour never depends on events.

## Vue adapter (packages/vue/src)

| File                 | Role                                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reactive-node.ts`   | wraps core nodes; one version ref per form and a `computed` over it per node read, so a component re-renders only when a value it reads changes                        |
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
- Every node read is a `computed` over the version ref, so Vue re-renders a reader only when the value changes; this relies on core reads keeping their reference. `items` maps the core list through a `WeakMap` keyed by that list, so it keeps its reference too, and `kind`, `definition` and `key` never change, so they are not tracked. `errorMessage` runs `formatError` inside its `computed`, so it also tracks the refs the formatter reads, such as vue-i18n's locale. `listErrors` keeps one `computed` per `listErrorsKey`, the key the core caches by. Guarded by "a field component re-renders only when its own field changes", "a computed over array items is not re-evaluated when another field changes" and "an error summary re-renders only when the listed errors change" in `use-form.test.ts`, and "shows a translated message in the current language" in `create-formtree.test.ts`.
- Devtools are Vue only (React DevTools has no plugin API) and read-only: an edit from the devtools would be a write path outside the error producers of rule 4. They are on by default through `createFormtree` and off with `devtools: false`.
- Production builds drop the devtools. The code runs behind `process.env.NODE_ENV != 'production'`, declared locally in `create-formtree.ts` so no Node types leak into the `.d.ts`, and `sideEffects: false` here and in `@vue/devtools-api` / `@vue/devtools-kit` lets bundlers remove it.
- `@vue/devtools-api` is a required peer, as in Pinia 4, because the main entry imports it: an optional peer would break resolution when it is missing, and a dependency would fix the version for the app. Plugin types are derived from `setupDevtoolsPlugin`, since `@vue/devtools-kit`, which declares them, is not a direct dependency.
- `useForm` reads the registry with `hasInjectionContext()` first, so a form in a bare `effectScope` (tests) neither registers nor warns.
- The inspector lists declared children in definition order, then schema keys that have a value or an error, sorted; a schema cannot be asked for its keys.
- The Vue Devtools v8 sidebar shows only the descriptor's `logo` and accepts an `http(s)` or `/` URL or a bundled `custom-ic-baseline-*` name, not a data URI, so `logo` names the bundled `dynamic_form` icon.
- No console warnings for misuse (such as an `initialValue` that changes after `useForm`); pitfalls go in the docs, and runtime visibility comes from the devtools.

## React adapter (packages/react/src)

| File                    | Role                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-node-state.ts`     | `useNodeState(node, select?)`: `useSyncExternalStore` over the node's `subscribe`, with the form's `version` as the snapshot and a shallow-equal memo of the selection    |
| `use-form.ts`           | `createForm` once per component (`useState` initializer), id from `useId`, `setDeps` in an effect when `deps` changes, `dispose` on unmount; never subscribes or provides |
| `node-context.tsx`      | `<FormNodeProvider node>` (explicit), `useFormNode(Definition)` (nearest node of that definition, throws otherwise), `useFormNode()` (nearest node, loose type)           |
| `use-field.ts`          | `useField(name \| node)`: `value`, `setValue`, `attrs` (null aria mapped to undefined, `onBlur`), `state`, `errorMessage`, ids; selects the field's own reads             |
| `formtree-provider.tsx` | `<FormtreeProvider>`: `FormDefaults` for every `useForm` below it, read once when a form is created, and `language`, which re-renders every reader when it changes        |

- Nodes are the core's own objects: `useSyncExternalStore` needs only the memoised reads, so nothing is wrapped.
- A component re-renders only through `useNodeState` and `useField`; `useForm` and `useFormNode` never subscribe. React re-renders every child of a re-rendered component, so a subscription to the root or a group would re-render the whole subtree on every keystroke. A component reads what it shows with a selector, `useNodeState(card, node => node.state.active)`, the counterpart of a Vue `computed`. Reading a node without a hook gives the last render's value; `apps/docs/guide/components.md` says so. Guarded by "the component does not re-render when the form changes" and "only the field component whose field changed re-renders" in `use-form.test.tsx`.
- `useNodeState` memoises the selection itself instead of depending on `use-sync-external-store/with-selector`. A selection is computed once per form `version` and selector, and the previous one is kept while the new one is shallowly equal (the core's `shallowEqual`, one level of an array or a plain object), so a selector may return a new object of the values it read; zustand turns that into a render loop. Guarded by "with a selector, the component re-renders only when the selected value changes", "a selector may return a new object of the values it read" and "a selector may return a new array of the values it read" in `use-node-state.test.tsx`.
- `useField` selects the field's `state`, `attributes` and `errorMessage`. `attributes` carries the path, so an input whose row moves gets its new ids even when no parent re-renders. Guarded by "an input follows its row when the row moves" in `use-field.test.tsx`.
- `FormNodeProvider` memoises its context value by node and parent and renders `NODE_CONTEXT.Provider`, which keeps React 18.3 working (peer `^18.3.0 || ^19.0.0`).
- Under `StrictMode` effects run twice, so `dispose` runs before the form is used; `dispose` only cancels async work and the form keeps working (tested).
- `value` and `setValue` instead of ready-made input props: only the component knows how its element represents the value (numbers, empty strings, objects from a select).
- Same names as the Vue adapter except the providers (`<FormNodeProvider>`, `<FormtreeProvider>` where Vue has `provideFormNode`, `createFormtree`).
- `language` on `<FormtreeProvider>` is how a language switch reaches React, which cannot see the language a `formatError` reads. A form reads its options once, so `formatError` reads the language itself (a new function would never reach the form), and a new `language` re-renders every `useNodeState` and `useField` reader, whose selection memo includes it. It has a context of its own, because the defaults object changes whenever an inline default such as `focusElement` does, and readers must not re-render with it. Guarded by "a new language re-renders the messages of every form below it" in `formtree-provider.test.tsx`.

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
- Definitions are values, not components. They are camelCase with a kind suffix, such as `emailField`, `deliveryGroup` or `lineItemsArray`. A definition used as the root of a form ends with `Form` instead (`signUpForm`), so `useForm(signUpForm)` reads as a sentence; the suffix names what the definition is used as. PascalCase stays for types, interfaces and components.
- Components never receive nodes through props. A business component reads its node with `useFormNode(Definition)`, a generic input takes a `name` and a row takes an `index`.
- React components live in kebab-case `.tsx` files with named exports.
- A constant used by one file stays in that file. Only a package's entry re-exports.
- Relative imports have no extension.
- Type-only modules are `.ts`, never `.d.ts`, since `skipLibCheck` would hide their errors.

## Docs (apps/docs)

VitePress 2 (alpha) site in English, written after the Vue docs. `guide/` holds four sidebar sections: Getting Started (Introduction, Quick Start), Essentials (the 80% of forms, read in order), Building the UI (where formtree meets components, one view per framework) and Going Further. `examples/` holds live Vue demos from simplest to most complex, each followed by every file it uses in a code group. Never use search-ads-ui domain terms in docs, playgrounds or tests.

| Path                                                                | Role                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `examples/forms/*.ts`                                               | definitions, one file per part (`contact`, `delivery`, `payment`, `line-items`, `promo-code`, composed in `checkout`), and a fake API; used by the demos and, through twoslash `extraFiles`, by guide snippets (`./forms/<name>`); a new file goes into `EXAMPLE_FORMS` in `.vitepress/config.ts`               |
| `examples/demos/*.vue`                                              | live demos, embedded in `examples/*.md` inside `<DemoFrame>`                                                                                                                                                                                                                                                    |
| `examples/components/*.vue`                                         | generic `text-field` / `number-field` / `select-field` built on `useField(name)`                                                                                                                                                                                                                                |
| `.vitepress/config.ts`                                              | sidebar, twoslash (`ts twoslash` blocks are type-checked at build time), aliases to package sources                                                                                                                                                                                                             |
| `.vitepress/theme/framework*.ts`, `components/framework-select.vue` | the framework select: `?framework=` sets `<html data-framework>` before paint, generated CSS hides the other `*-only` blocks, the choice stays in the URL across routes and `/api/` redirects to the chosen package; a new framework is one entry in each map in `framework.ts`                                 |
| `.vitepress/page-markdown.ts`, `components/copy-page.vue`           | Markdown for agents: at build, each page becomes clean Markdown per framework (`<page>.md` for Vue, `.react.md`, `.javascript.md`) plus `llms.txt` and `llms-full.txt`; in dev a middleware serves the same files. The Copy page button copies the selected framework's file and links it to ChatGPT and Claude |
| `typedoc.json`                                                      | API reference: TypeDoc + typedoc-plugin-markdown + typedoc-vitepress-theme write `api/` (gitignored) before `dev` and `build`; one page per symbol, linked to its source on GitHub at the built commit (`sourceLinkTemplate`); the sidebar is read from `api/typedoc-sidebar.json` at config load               |

The site is deployed on Netlify at https://form-tree.netlify.app. `og:image` is that site's absolute URL, since most link previews ignore a relative one. `public/og-image.png` is rendered from `.vitepress/og-image.html` at 1200×630 with headless Chrome (`--window-size=1200,630 --force-device-scale-factor=1 --allow-file-access-from-files --screenshot`).

`guide/groups.md` states that a schema key is not a child, and the `children` JSDoc repeats it. The option keeps its name: it pairs with `childDeps`, and nesting definitions as `children` matches route trees.

Writing:

- The guide follows the [Vue docs writing guide](https://github.com/vuejs/docs/blob/main/.github/contributing/writing-guide.md). The rules below are how it applies here.
- Docs are plain and leave no open question. They explain concepts, behaviour and reasons, and show them in code.
- A guide section opens with one sentence that names the task and the tool and leads into the code ("Define it with `defineField`, and add it to a group's `children`:"), then says in a sentence or two what the code does. That is the whole section unless the reader needs more to use the feature. Headings are short task names in Title Case ("Defining a Field", "Saving One Row"), never a bare API name. `guide/fields.md` is the model.
- A problem comes first only where the task alone does not show why a feature exists, and then as one sentence, as in Vue's "It can be cumbersome to wire up value bindings by hand. `v-model` simplifies this to:". No scenario stories ("A shop edits a product's price on the product page…"), no edge cases or caveats beyond the section's point, nothing the API reference already says.
- The Introduction is where problems are told at length. There a problem is a situation the reader has lived through, told in plain, general words as one case and what goes wrong in it, ending on the one consequence the reader feels; formtree's features reworded as needs ("a form has to decide when…") are not a problem.
- A section introduces one new concept, in its prose and in its code. A tutorial step brings one API: a sentence on what it is for leads into a small block, then a sentence or two say what it does for the user. A run of sentences each led by an identifier ("`useForm` creates…, `form.field` returns…, `model` goes to…") is line-by-line commentary, so split the step instead.
- A point gets one familiar case, named plainly. A vague mention ("a card on an edit page") leaves the reader guessing, and a second case that repeats the point ("A settings page with a Save button in each section works the same way") is detail.
- The Introduction has no code. It says what formtree is, the problem it solves and the idea behind it, each problem section in prose. Code starts in Quick Start, where the Prerequisites tip that opens Installation states the knowledge the guide assumes.
- Every sentence earns its place. A page does not restate what the code just showed, has no intro that recaps the sidebar and no "Next" section.
- Prose explains with the idea, not an inventory. It does not list a form's parts, fields or messages ("contact details, a delivery address, and a payment"), since the code shows them, and behaviour beyond the section's point (kept values, focus, trimming) waits for the page that teaches it. One familiar example is enough.
- Prose never lists what can grow or change, such as the supported frameworks, compatible libraries, version ranges or what an object carries. It names the kind ("framework-agnostic", "any Standard Schema library", "the other attributes the input needs") and leaves the rest to the code and the API reference, so a new adapter or attribute needs no prose edit.
- The running text carries only what the section needs: the task, the code, what it does. A side fact a reader may want but does not need to follow the section, such as a shortcut, an alternative or a related detail ("A dotted path from the root, `form.field('address.city')`, returns the same node."), goes in a `::: tip` with a short title. Warnings go in `::: warning`. Callouts stay few and never sit two in a row.
- Prose has few colons. A sentence ends with a colon only when it leads directly into a code block or a list ("Here is a small example:"). An "X: Y" clause inside a sentence becomes two sentences, a "because" or "so" clause, or a comma.
- Lists in prose use the Oxford comma ("the inputs, the layout, and the wording").
- The guide never copies what the API reference lists, such as members, options or defaults. It links to the reference instead.
- No page compares formtree to another library or borrows one as a reference point. A library is named only where an example uses it.
- A child is always an entry of a group's `children`, a node with a definition of its own. A key of a schema is a node too, but prose calls it a key or a lens node, never a child.

Framework views:

- Content that differs per framework sits in `<div class="vue-only">`, `<div class="react-only">` or `<div class="javascript-only">`, with a blank line after the opening tag and before the closing one, or the Markdown inside does not render.
- Vue comes first. It is the default view, and frameworks always appear in the order Vue, React, JavaScript: in the framework select, in prose, in tables and in the source order of the blocks.
- `page-markdown.ts` turns every Markdown extension, container and component the pages use into plain Markdown: twoslash cuts and directives, `<<<` includes, `::: code-group`, callouts, framework blocks, `<script setup>` and components such as `<DemoFrame>`. A page that uses a new one needs a case there, or it leaks into what agents copy.
- A heading inside a framework block gets an id that starts with the block's class (`## Inspecting a Form {#vue-only-inspecting-a-form}`), so the page outline hides it in the other views.
- Every example a reader would copy exists in all three views. Where Vue and React use components, the JavaScript view uses functions that take a node.
- A concept snippet that reads the same in every framework sits outside the blocks and imports from `@formtree/core` above `// ---cut---`, so the reader sees no import.
- A full-file example shows its imports. Vue and React import from their adapter package, because adapter users install only the adapter; JavaScript imports from `@formtree/core`.
- The JavaScript view binds inputs with a `bindInput(key)` helper (Quick Start, Submit the Form): `input` calls `setValue`, `blur` calls `blur()`, and `field.subscribe` writes `errorMessage`.

Code blocks:

- A `handleSubmit` handler returns `void` or server errors, because its return value is read as server errors. Write `async contact => { await sendMessage(contact) }`, never `contact => sendMessage(contact)` when the call returns a value.
- Code blocks are type-checked with twoslash. Setup lines go above `// ---cut---`, and shared definitions are imported rather than repeated. Twoslash resolves only `@formtree/core` and `@formtree/vue`, so React blocks are plain `ts`/`tsx` and Vue SFC blocks plain `vue`; check those by hand against a twoslash-checked twin. A local module in a twoslash block is declared with a hidden `// @filename: api.ts`.
- Type queries (`//    ^?`) go only where the displayed type reads well.
- Hovers add to the page size, so a block whose hovers add nothing starts with `// @noStaticSemanticInfo`. It keeps the type check and drops the hovers.
- Vue templates use `@submit.prevent`.
- A block that repeats an earlier step's code highlights its new lines with fence meta such as `vue{2,6,10-12}`, so the reader sees what the step added.

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
