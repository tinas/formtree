---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

Add `formatError`, `errorMessage` and app defaults. `formatError` turns an error into text once for a form; every node's `errorMessage` shows its first visible error through it, and `form.formatError` serves error summaries. `createFormtree()` in Vue and `<FormtreeProvider>` in React give every form of an app its `formatError`, `focusElement` and other defaults.
