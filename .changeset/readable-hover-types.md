---
'@formtree/core': patch
'@formtree/vue': patch
'@formtree/react': patch
---

Hovers show drafts, outputs and definitions as plain object shapes at every depth. Nested parts no longer show as `Simplify<DraftObject<…> & {} & {…}>`, and a group node shows its values and its children instead of `GroupDefinitionOf<…>` with the schema types and `NoInfer`.
