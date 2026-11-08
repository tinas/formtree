# @formtree/react

## 0.3.0

### Minor Changes

- [#52](https://github.com/tinas/formtree/pull/52) [`0d01011`](https://github.com/tinas/formtree/commit/0d01011dde44ee6c05f6dfbe74a09a2a4350ccfb) Thanks [@tinas](https://github.com/tinas)! - `state.requesting` is `true` while a check's `run` or a schema that answers asynchronously runs in the subtree, so a "Checking…" hint no longer shows while a check waits after its trigger or before a run that new deps start returns early. `validating` keeps its meaning and stays `true` from the trigger until the answer. The Vue devtools tag a waiting check apart from a requesting one.

### Patch Changes

- Updated dependencies [[`0d01011`](https://github.com/tinas/formtree/commit/0d01011dde44ee6c05f6dfbe74a09a2a4350ccfb)]:
  - @formtree/core@0.3.0

## 0.2.0

### Minor Changes

- [#49](https://github.com/tinas/formtree/pull/49) [`28a7348`](https://github.com/tinas/formtree/commit/28a7348ba23f8d8e964a728b7fa0eb0f49f3560d) Thanks [@tinas](https://github.com/tinas)! - A check keeps no answers. `validate()` and every submit ask each check again and wait for one that is already running, and a value that comes back is asked again on its trigger, so the server stays the source of truth. A root submit after a step submit asks the step's checks again; schemas and rules still run only for values that changed. To send fewer requests, cache the request inside `run`. The Vue devtools no longer show "Check reused".

- [#27](https://github.com/tinas/formtree/pull/27) [`4d9b453`](https://github.com/tinas/formtree/commit/4d9b453fbe495a3236498879880502c3447f919e) Thanks [@tinas](https://github.com/tinas)! - `listErrors`, `state.errors` and `onInvalid` list errors in the form's definition order instead of path order: a node's own errors first, then the nodes declared below it in order and rows in list order, with a schema's errors in the order it reports them. A failed submit skips fields hidden on the page when it moves focus, and runs `onInvalid` first, waiting for the promise it returns, so `onInvalid` can open a dialog before its field is focused.

- [#24](https://github.com/tinas/formtree/pull/24) [`b2b5063`](https://github.com/tinas/formtree/commit/b2b50637f8347bc5a36a8da62b46810e6439a1e8) Thanks [@tinas](https://github.com/tinas)! - `handleSubmit` no longer calls `preventDefault()` on an event, and the function it returns takes no arguments. Prevent the default yourself, with `@submit.prevent` in Vue or `event.preventDefault()` in React and plain JavaScript. `SubmitEventLike` is removed.

- [#24](https://github.com/tinas/formtree/pull/24) [`b2b5063`](https://github.com/tinas/formtree/commit/b2b50637f8347bc5a36a8da62b46810e6439a1e8) Thanks [@tinas](https://github.com/tinas)! - A failed async check is no longer an error. When `run` throws, the node lists the check in `state.failedChecks`, `valid` is `false` and the input is not marked invalid. A failed check runs again on its next trigger, even for the same value. A submit whose check fails again resolves to `'unchecked'`. `ASYNC_FAILED_CODE` is removed. The Vue devtools show failed checks.

- [#37](https://github.com/tinas/formtree/pull/37) [`633837b`](https://github.com/tinas/formtree/commit/633837bbb0fbc91ea24b693c178b80be40312681) Thanks [@tinas](https://github.com/tinas)! - `reset` takes `keepDirtyValues: true`, which keeps every value the user changed and resets only the rest, so fresh data passed as `value` reaches a form without erasing an edit. A list the user changed is kept whole, and a kept value stays dirty only while it differs from the new initial value.

- [#26](https://github.com/tinas/formtree/pull/26) [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74) Thanks [@tinas](https://github.com/tinas)! - Every node has `subscribe`, which calls the listener only after a change to that node's `state` or path. The form's `subscribe` still runs after every change.

- [#34](https://github.com/tinas/formtree/pull/34) [`fe50951`](https://github.com/tinas/formtree/commit/fe509519790ee64c483b16bbcee6fba74277a60e) Thanks [@tinas](https://github.com/tinas)! - Only plain objects and arrays are walked by paths and compared by their contents. A `File`, a `Map`, a Temporal date or a class instance is a value of its own and compares by identity, a `Date` by its time, so choosing another file marks a field dirty and an async check runs for every different file. A path does not reach inside such a value, and a write below one replaces it. A class instance given where a group is expected becomes a plain object of its own values. A field with `validateAsync` no longer throws on a `bigint`.

  `isPlainObject` and `shallowEqual` are exported. `setDeps` and `childDeps` compare arrays item by item, so an equal new array changes nothing, and `useNodeState` compares a selection with `shallowEqual`.

- [#34](https://github.com/tinas/formtree/pull/34) [`fe50951`](https://github.com/tinas/formtree/commit/fe509519790ee64c483b16bbcee6fba74277a60e) Thanks [@tinas](https://github.com/tinas)! - Paths, definitions and values are read by their own keys only. A key named like an `Object` member, such as `constructor`, is an ordinary key, so `form.field('constructor')` no longer throws, and a value on a polluted `Object.prototype` never reaches the form. A path through `__proto__` reads `undefined` and ignores writes.

- [#26](https://github.com/tinas/formtree/pull/26) [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74) Thanks [@tinas](https://github.com/tinas)! - `<FormtreeProvider>` takes the current `language`. When it changes, every component that reads a form below it re-renders, so the messages of a `formatError` that reads the language follow a switch without `useTranslation()` in each input.

- [#26](https://github.com/tinas/formtree/pull/26) [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74) Thanks [@tinas](https://github.com/tinas)! - `useForm` and `useFormNode` no longer re-render the component. A component reads what it shows with `useNodeState(node, select)`, which re-renders it only when the selected value changes, compared shallowly, or with `useField`, which re-renders it only when its field changes. `useNodeState(node)` without a selector returns the whole state as before.

- [#40](https://github.com/tinas/formtree/pull/40) [`2f6ce5c`](https://github.com/tinas/formtree/commit/2f6ce5c478c1b30b53a902d5d2d3a263da048d73) Thanks [@tinas](https://github.com/tinas)! - Nodes report `state.required`, true when the schema rejects an empty value, and `attributes` carry `aria-required`. In Vue and React, `attrs` passes it to the input, so a label can mark the field and a screen reader announces it as required. The schema is asked once with the form empty, so a part that `activeWhen` turns on is required while it is on, and typing never asks the schema again.

- [#42](https://github.com/tinas/formtree/pull/42) [`68d8674`](https://github.com/tinas/formtree/commit/68d86748187929278cff8629b0232d3476a6a51b) Thanks [@tinas](https://github.com/tinas)! - Writing `undefined` to a key now removes the key from the draft instead of keeping it with an `undefined` value. A cleared field reads `undefined` as before, and schemas that accept a missing key but reject `undefined`, such as ArkType's optional keys and Valibot's `exactOptional`, accept it. Errors from ArkType schemas land on the field they belong to; a field's own error used to land on a `.0` path below it, so the input never showed it.

- [#26](https://github.com/tinas/formtree/pull/26) [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74) Thanks [@tinas](https://github.com/tinas)! - `getAttributes()` is replaced by the `attributes` property. It returns the same object until one of the attributes changes, like `state`.

- [#26](https://github.com/tinas/formtree/pull/26) [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74) Thanks [@tinas](https://github.com/tinas)! - `listErrors` returns a readonly array that keeps its reference while the listed errors stay the same. In Vue, a component that reads it re-renders only when they change.

- [#47](https://github.com/tinas/formtree/pull/47) [`f38c2f3`](https://github.com/tinas/formtree/commit/f38c2f3e078b18e99b8c2f271173353a8d329418) Thanks [@tinas](https://github.com/tinas)! - A submit handler's return value is no longer read as errors, so a function that returns the saved record is a handler as it is, as in `row.handleSubmit(saveLineItem)`. Write the server's errors with `setErrors` inside the handler instead of returning them. The submit still resolves to `'rejected'` and moves focus to them.

### Patch Changes

- [#48](https://github.com/tinas/formtree/pull/48) [`cecccaa`](https://github.com/tinas/formtree/commit/cecccaaee73880f1bf585df939460c3578a1e55e) Thanks [@tinas](https://github.com/tinas)! - Every package has a top-level `types` field, so a project on `moduleResolution: node` finds the declarations, and declares TypeScript 5.4 or later as an optional peer, so an older TypeScript warns at install instead of failing on `NoInfer`. The READMEs show a working example and the requirements.

- [#46](https://github.com/tinas/formtree/pull/46) [`4078cf9`](https://github.com/tinas/formtree/commit/4078cf9f226c02b4e9109b267fc00bce10ec2759) Thanks [@tinas](https://github.com/tinas)! - `reset({ value })` takes a partial draft, as `initialValue` does, and both take readonly lists, so a submit's output or a server object that leaves out a part or holds a readonly array resets a form without a cast.
- Updated dependencies [[`28a7348`](https://github.com/tinas/formtree/commit/28a7348ba23f8d8e964a728b7fa0eb0f49f3560d), [`4d9b453`](https://github.com/tinas/formtree/commit/4d9b453fbe495a3236498879880502c3447f919e), [`b2b5063`](https://github.com/tinas/formtree/commit/b2b50637f8347bc5a36a8da62b46810e6439a1e8), [`b2b5063`](https://github.com/tinas/formtree/commit/b2b50637f8347bc5a36a8da62b46810e6439a1e8), [`633837b`](https://github.com/tinas/formtree/commit/633837bbb0fbc91ea24b693c178b80be40312681), [`4c859ab`](https://github.com/tinas/formtree/commit/4c859ab65e43db98a63685d965f8e00de84b6303), [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74), [`fe50951`](https://github.com/tinas/formtree/commit/fe509519790ee64c483b16bbcee6fba74277a60e), [`fe50951`](https://github.com/tinas/formtree/commit/fe509519790ee64c483b16bbcee6fba74277a60e), [`cecccaa`](https://github.com/tinas/formtree/commit/cecccaaee73880f1bf585df939460c3578a1e55e), [`4078cf9`](https://github.com/tinas/formtree/commit/4078cf9f226c02b4e9109b267fc00bce10ec2759), [`2f6ce5c`](https://github.com/tinas/formtree/commit/2f6ce5c478c1b30b53a902d5d2d3a263da048d73), [`68d8674`](https://github.com/tinas/formtree/commit/68d86748187929278cff8629b0232d3476a6a51b), [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74), [`326f1b6`](https://github.com/tinas/formtree/commit/326f1b6ff8ecbe69cec213534d628942db5aee74), [`f38c2f3`](https://github.com/tinas/formtree/commit/f38c2f3e078b18e99b8c2f271173353a8d329418)]:
  - @formtree/core@0.2.0

## 0.1.0

### Minor Changes

- [`98607fe`](https://github.com/tinas/formtree/commit/98607fe794ced4f9f339a3c10b0ea994f32e66a5) Thanks [@tinas](https://github.com/tinas)! - Initial release. A form is a tree of definitions, and every node of it, from a wizard step to a single field, validates and submits on its own. `@formtree/core` is the framework-free engine with Standard Schema validation, conditional branches, dependencies and asynchronous checks. `@formtree/vue` and `@formtree/react` bind it to components, and `@formtree/vue` shows forms in Vue Devtools.

### Patch Changes

- Updated dependencies [[`98607fe`](https://github.com/tinas/formtree/commit/98607fe794ced4f9f339a3c10b0ea994f32e66a5)]:
  - @formtree/core@0.1.0

## 0.1.0-alpha.1

### Patch Changes

- [#2](https://github.com/tinas/formtree/pull/2) [`60d7aab`](https://github.com/tinas/formtree/commit/60d7aab641b360c28de526fc33a2d859eba96734) Thanks [@tinas](https://github.com/tinas)! - Add a README to each package for its npm page.
- Updated dependencies [[`60d7aab`](https://github.com/tinas/formtree/commit/60d7aab641b360c28de526fc33a2d859eba96734)]:
  - @formtree/core@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- [`54cde88`](https://github.com/tinas/formtree/commit/54cde88d003730a4f9a4e46b781f2a80baf454be) Thanks [@tinas](https://github.com/tinas)! - Add `formatError`, `errorMessage` and app defaults. `formatError` turns an error into text once for a form; every node's `errorMessage` shows its first visible error through it, and `form.formatError` serves error summaries. `createFormtree()` in Vue and `<FormtreeProvider>` in React give every form of an app its `formatError`, `focusElement` and other defaults.

- [`98607fe`](https://github.com/tinas/formtree/commit/98607fe794ced4f9f339a3c10b0ea994f32e66a5) Thanks [@tinas](https://github.com/tinas)! - Initial release.

### Patch Changes

- Updated dependencies [[`54cde88`](https://github.com/tinas/formtree/commit/54cde88d003730a4f9a4e46b781f2a80baf454be), [`98607fe`](https://github.com/tinas/formtree/commit/98607fe794ced4f9f339a3c10b0ea994f32e66a5), [`054670b`](https://github.com/tinas/formtree/commit/054670b5d1a66db81e0cddd7fdd22c196854bf06)]:
  - @formtree/core@0.1.0-alpha.0
