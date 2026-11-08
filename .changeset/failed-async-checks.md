---
'@formtree/core': minor
'@formtree/vue': minor
'@formtree/react': minor
---

A failed async check is no longer an error. When `run` throws, the node lists the check in `state.failedChecks`, `valid` is `false` and the input is not marked invalid. A failed check runs again on its next trigger, even for the same value. A submit whose check fails again resolves to `'unchecked'`. `ASYNC_FAILED_CODE` is removed. The Vue devtools show failed checks.
