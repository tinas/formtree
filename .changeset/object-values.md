---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

Only plain objects and arrays are walked by paths and compared by their contents. A `File`, a `Map`, a Temporal date or a class instance is a value of its own and compares by identity, a `Date` by its time, so choosing another file marks a field dirty and an async check runs for every different file. A path does not reach inside such a value, and a write below one replaces it. A class instance given where a group is expected becomes a plain object of its own values. A field with `validateAsync` no longer throws on a `bigint`.

`isPlainObject` and `shallowEqual` are exported. `setDeps` and `childDeps` compare arrays item by item, so an equal new array changes nothing, and `useNodeState` compares a selection with `shallowEqual`.
