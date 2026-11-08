---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

`listErrors`, `state.errors` and `onInvalid` list errors in the form's definition order instead of path order: a node's own errors first, then the nodes declared below it in order and rows in list order, with a schema's errors in the order it reports them. A failed submit skips fields hidden on the page when it moves focus, and runs `onInvalid` first, waiting for the promise it returns, so `onInvalid` can open a dialog before its field is focused.
