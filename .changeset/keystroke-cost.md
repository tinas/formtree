---
'@formtree/core': patch
---

A change no longer makes every field on the page scan all of the form's errors and touched fields, so typing into a large form costs each field the same however many fields it has.
