---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

`handleSubmit` no longer calls `preventDefault()` on an event, and the function it returns takes no arguments. Prevent the default yourself, with `@submit.prevent` in Vue or `event.preventDefault()` in React and plain JavaScript. `SubmitEventLike` is removed.
