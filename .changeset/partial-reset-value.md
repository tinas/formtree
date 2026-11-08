---
'@formtree/core': patch
'@formtree/vue': patch
'@formtree/react': patch
---

`reset({ value })` takes a partial draft, as `initialValue` does, and both take readonly lists, so a submit's output or a server object that leaves out a part or holds a readonly array resets a form without a cast.
