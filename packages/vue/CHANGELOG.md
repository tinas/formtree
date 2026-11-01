# @formtree/vue

## 0.1.0-alpha.1

### Patch Changes

- [#2](https://github.com/tinas/formtree/pull/2) [`60d7aab`](https://github.com/tinas/formtree/commit/60d7aab641b360c28de526fc33a2d859eba96734) Thanks [@tinas](https://github.com/tinas)! - Add a README to each package for its npm page.
- Updated dependencies [[`60d7aab`](https://github.com/tinas/formtree/commit/60d7aab641b360c28de526fc33a2d859eba96734)]:
  - @formtree/core@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- [`54cde88`](https://github.com/tinas/formtree/commit/54cde88d003730a4f9a4e46b781f2a80baf454be) Thanks [@tinas](https://github.com/tinas)! - Add `formatError`, `errorMessage` and app defaults. `formatError` turns an error into text once for a form; every node's `errorMessage` shows its first visible error through it, and `form.formatError` serves error summaries. `createFormtree()` in Vue and `<FormtreeProvider>` in React give every form of an app its `formatError`, `focusElement` and other defaults.

- [`98607fe`](https://github.com/tinas/formtree/commit/98607fe794ced4f9f339a3c10b0ea994f32e66a5) Thanks [@tinas](https://github.com/tinas)! - Initial release.

- [`054670b`](https://github.com/tinas/formtree/commit/054670b5d1a66db81e0cddd7fdd22c196854bf06) Thanks [@tinas](https://github.com/tinas)! - Show the forms of a Vue app in Vue Devtools: a read-only inspector for every form created with `useForm`, and a timeline of its changes, checks and submits. `createFormtree()` turns it on while developing; production builds leave it out.

### Patch Changes

- Updated dependencies [[`54cde88`](https://github.com/tinas/formtree/commit/54cde88d003730a4f9a4e46b781f2a80baf454be), [`98607fe`](https://github.com/tinas/formtree/commit/98607fe794ced4f9f339a3c10b0ea994f32e66a5), [`054670b`](https://github.com/tinas/formtree/commit/054670b5d1a66db81e0cddd7fdd22c196854bf06)]:
  - @formtree/core@0.1.0-alpha.0
