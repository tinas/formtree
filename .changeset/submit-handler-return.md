---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

A submit handler's return value is no longer read as errors, so a function that returns the saved record is a handler as it is, as in `row.handleSubmit(saveLineItem)`. Write the server's errors with `setErrors` inside the handler instead of returning them. The submit still resolves to `'rejected'` and moves focus to them.
