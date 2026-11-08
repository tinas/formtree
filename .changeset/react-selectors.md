---
'@formtree/react': minor
---

`useForm` and `useFormNode` no longer re-render the component. A component reads what it shows with `useNodeState(node, select)`, which re-renders it only when the selected value changes, compared shallowly, or with `useField`, which re-renders it only when its field changes. `useNodeState(node)` without a selector returns the whole state as before.
