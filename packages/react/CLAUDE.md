# @formtree/react

## Architecture (src)

| File                    | Role                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-node-state.ts`     | `useNodeState(node, select?)`: `useSyncExternalStore` over the node's `subscribe`, with the form's `version` as the snapshot and a shallow-equal memo of the selection    |
| `use-form.ts`           | `createForm` once per component (`useState` initializer), id from `useId`, `setDeps` in an effect when `deps` changes, `dispose` on unmount; never subscribes or provides |
| `node-context.tsx`      | `<FormNodeProvider node>` (explicit), `useFormNode(Definition)` (nearest node of that definition, throws otherwise), `useFormNode()` (nearest node, loose type)           |
| `use-field.ts`          | `useField(name \| node)`: `value`, `setValue`, `attrs` (null aria mapped to undefined, `onBlur`), `state`, `errorMessage`, ids; selects the field's own reads             |
| `formtree-provider.tsx` | `<FormtreeProvider>`: `FormDefaults` for every `useForm` below it, read once when a form is created, and `language`, which re-renders every reader when it changes        |

## Decisions

- Nodes are the core's own objects; `useSyncExternalStore` needs only the memoised reads, so nothing is wrapped.
- A component re-renders only through `useNodeState` and `useField`; `useForm` and `useFormNode` never subscribe, because React re-renders every child of a re-rendered component and a subscription to the root would re-render the whole form on every keystroke. A component reads what it shows with a selector, the counterpart of a Vue `computed`; a read without a hook gives the last render's value, as `apps/docs/guide/components.md` says. Guarded by "the component does not re-render when the form changes" and "only the field component whose field changed re-renders" in `use-form.test.tsx`.
- `useNodeState` memoises the selection itself instead of depending on `use-sync-external-store/with-selector`. A selection is computed once per form `version` and selector, and the previous one is kept while the new one is equal by the core's `shallowEqual`, so a selector may return a new object of the values it read (zustand turns that into a render loop). Guarded by "with a selector, the component re-renders only when the selected value changes", "a selector may return a new object of the values it read" and "a selector may return a new array of the values it read" in `use-node-state.test.tsx`.
- `useField` selects the field's `state`, `attributes` and `errorMessage`. `attributes` carries the path, so an input whose row moves gets its new ids even when no parent re-renders. Guarded by "an input follows its row when the row moves" in `use-field.test.tsx`.
- `FormNodeProvider` memoises its context value by node and parent and renders `NODE_CONTEXT.Provider`, which keeps React 18.3 working (peer `^18.3.0 || ^19.0.0`).
- Under `StrictMode` effects run twice, so `dispose` runs before the form is used; `dispose` only cancels async work and the form keeps working (tested).
- `useField` gives `value` and `setValue`, not ready-made input props, because only the component knows how its element represents the value.
- Names match the Vue adapter except the providers (`<FormNodeProvider>`, `<FormtreeProvider>` where Vue has `provideFormNode`, `createFormtree`).
- `language` on `<FormtreeProvider>` is how a language switch reaches React, which cannot see the language a `formatError` reads. A form reads its options once, so `formatError` reads the language itself, and a new `language` re-renders every `useNodeState` and `useField` reader through their selection memo. It has a context of its own, because the defaults object changes whenever an inline default does and readers must not re-render with it. Guarded by "a new language re-renders the messages of every form below it" in `formtree-provider.test.tsx`.
