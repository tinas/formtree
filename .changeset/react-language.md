---
'@formtree/react': minor
---

`<FormtreeProvider>` takes the current `language`. When it changes, every component that reads a form below it re-renders, so the messages of a `formatError` that reads the language follow a switch without `useTranslation()` in each input.
