---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

Writing `undefined` to a key now removes the key from the draft instead of keeping it with an `undefined` value. A cleared field reads `undefined` as before, and schemas that accept a missing key but reject `undefined`, such as ArkType's optional keys and Valibot's `exactOptional`, accept it. Errors from ArkType schemas land on the field they belong to; a field's own error used to land on a `.0` path below it, so the input never showed it.
