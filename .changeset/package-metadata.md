---
'@formtree/core': patch
'@formtree/vue': patch
'@formtree/react': patch
---

Every package has a top-level `types` field, so a project on `moduleResolution: node` finds the declarations, and declares TypeScript 5.4 or later as an optional peer, so an older TypeScript warns at install instead of failing on `NoInfer`. The READMEs show a working example and the requirements.
