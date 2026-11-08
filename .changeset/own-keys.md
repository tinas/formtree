---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

Paths, definitions and values are read by their own keys only. A key named like an `Object` member, such as `constructor`, is an ordinary key, so `form.field('constructor')` no longer throws, and a value on a polluted `Object.prototype` never reaches the form. A path through `__proto__` reads `undefined` and ignores writes.
