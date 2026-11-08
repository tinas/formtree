---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

Nodes report `state.required`, true when the schema rejects an empty value, and `attributes` carry `aria-required`. In Vue and React, `attrs` passes it to the input, so a label can mark the field and a screen reader announces it as required.
