---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

A check keeps no answers. `validate()` and every submit ask each check again and wait for one that is already running, and a value that comes back is asked again on its trigger, so the server stays the source of truth. A root submit after a step submit asks the step's checks again; schemas and rules still run only for values that changed. To send fewer requests, cache the request inside `run`. The Vue devtools no longer show "Check reused".
