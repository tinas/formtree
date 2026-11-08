---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

`reset` takes `keepDirtyValues: true`, which keeps every value the user changed and resets only the rest, so fresh data passed as `value` reaches a form without erasing an edit. A list the user changed is kept whole, and a kept value stays dirty only while it differs from the new initial value.
