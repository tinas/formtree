---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

`state.requesting` is `true` while a check's `run` or a schema that answers asynchronously runs in the subtree, so a "Checking…" hint no longer shows while a check waits after its trigger or before a run that new deps start returns early. `validating` keeps its meaning and stays `true` from the trigger until the answer. The Vue devtools tag a waiting check apart from a requesting one.
