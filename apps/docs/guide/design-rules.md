# Design Rules

formtree avoids guessing what you meant. Each behaviour below has one written rule, and the rest
of the library follows from them.

1. **State does not depend on rendering.** Mounting or unmounting a component never changes a
   value, an error or a registration. Libraries that tie a value to a mounted input lose data
   when a step of a wizard is left.
2. **Types come from schemas, not values.** A form holds `DraftOf<definition>` and a handler
   receives `OutputOf<definition>`. An initial value has to fit the draft but does not have to be
   complete. When a type is inferred from initial values, a field that starts empty gets the type
   of emptiness.
3. **A node is found by identity.** By its path, or in an adapter by its definition. There is no
   "nearest form" lookup that could attach a field in a dialog to the page form behind it.
4. **Every error has one producer.** Schema, `validate`, `validateAsync` or the server, and each
   one changes only its own errors.
5. **Validation runs on every change. `mode` only decides visibility.** Which rule applies and
   when the user sees it are separate questions with separate options.
6. **An inactive branch is not validated and is not in the output, but its value is kept.** No
   exceptions.
7. **Empty is `undefined`, structure always exists.** Declared groups are `{}` and declared arrays
   are `[]` from the start. Any value a schema describes is `undefined` while empty, and the
   schema decides whether that is an error. The library invents no other value: `push({})` adds
   an empty row.
8. **An array item is identified by its key, not its index.** When a row moves, its errors,
   touched state and cached checks move with it.
9. **A submit runs a fixed pipeline.** A node that is already submitting, or that is in an
   inactive branch, returns `'skipped'`. See [Submitting](/guide/submitting#the-pipeline).
10. **Dependencies flow down, explicitly.** From parent to child, never between siblings and never
    upwards, so a definition's options show everything its rules depend on.

## What formtree does not do

| Not included                                    | Why                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Components, renderless `Field`, directives      | Elements belong to you. The core gives state and behaviour, like TanStack Table.             |
| `canSubmit`                                     | A submit button is not disabled for an invalid form. Edit forms gate on `dirty`.             |
| Unregistering on unmount                        | Rule 1. Turn a branch off with `activeWhen`, clear it with `reset`.                          |
| `null` for empty, defaults derived from schemas | Rule 7. Empty is `undefined`, a new row is `push({})`.                                       |
| Adapters per schema library                     | Standard Schema only. Definitions build the tree, so no schema is ever split.                |
| Wildcard paths for asynchronous rules           | A check belongs to a definition and runs wherever that definition is used.                   |
| Dependencies between siblings                   | Rule 10. Move the shared value into the parent's schema.                                     |
| Message formatting                              | An error carries a code. The UI [translates](/guide/errors-and-focus#translating-errors) it. |
| Persistence and "unsaved changes" prompts       | `subscribe` and `state.dirty` are enough to build them in the app.                           |
| A `watch` API                                   | `subscribe` and `node.state` cover it, and adapters use their framework's own watch.         |
