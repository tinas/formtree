# Why FormTree?

## Forms Are Mostly Rules

Collecting values is the easy part of a form. Most of the work is in its rules: which values are
required, when an error becomes visible, which parts apply only after a certain answer, what the
server has to confirm, and what a submit finally sends.

In most apps, these rules live in components, next to the markup that renders them. Each new
requirement adds a flag or a condition to a template, and the rules end up spread across every
component the form uses. What a form requires can then only be learned by reading all of them, and
a change to the layout can quietly change the behaviour.

## Rules in One Place, Markup in Yours

FormTree keeps the rules of a form out of its components. A form is described by a definition, which
holds a schema for its values and the rules that the schema cannot express on its own. A definition
can contain other definitions for its parts, and this nesting is the tree in FormTree's name.

Creating a form turns every definition into a node with its own value, errors, and state. Because
every part is a node, any part can be validated, submitted, or reset on its own, so a step of a
wizard or a row of a list needs no extra code to behave as a unit. The components only read nodes
and render them, which keeps the markup, the styles, and the layout entirely yours.

## Is FormTree Opinionated?

Leaving the markup to the app does not leave every decision to it. FormTree makes some choices, and
most of them can be changed. When an error becomes visible, where focus goes after a failed submit,
how an error turns into text, and when a server check runs each have a default, and each can be
changed in a check, in a form, or once for the whole app.

Other choices are fixed, because changing them would make a form harder to trust:

- **Validation runs on every change.** A setting only decides when errors become visible, so
  `valid` is always accurate, even before the user sees an error.
- **An inactive part is neither validated nor submitted, but keeps its value.** A user who switches
  an answer back finds what they typed.
- **Empty is `undefined`, and FormTree never invents a value.** The output holds only what the user
  entered or the app set.
- **Each error has one producer.** A schema run never removes an error that the server reported.
- **Dependencies flow only from a parent to its children.** A part works in any form that hands it
  its data, and never depends on its siblings.

Nothing is set in stone. If a fixed choice gets in the way,
[open an issue](https://github.com/tinas/formtree/issues/new/choose) with the case, and we will
revisit it.

## What You Get

- Types read from the schema, so the form holds a draft that may still be incomplete, and the submit
  function receives the validated output.
- Validation on every change, while the moment an error becomes visible is chosen separately.
- Server checks declared next to the value they check, with stale requests cancelled and failed
  requests reported instead of passing silently.
- Parts that apply only after a certain answer, left out of validation and of the output while they
  do not, without losing their values.
- A submit for any node, which validates only that node and what is below it.
- Bindings that connect each input to its error for screen readers, and focus that moves to the
  first error after a failed submit.
- The same definition on the server, which validates a request with the rules of the form.
- A framework-agnostic core, with adapters that connect it to a framework.

## What Stays Yours

FormTree renders nothing. It ships no input components, no styles, and no built-in messages, so every
element on the page and every word in an error comes from the app. It never reads the inputs
either, because the values live in the form and the inputs only display them.

Some things are left out on purpose. FormTree does not disable a submit button while the form is
invalid, because an enabled button can show every error and focus the first one. It does not
persist drafts or prompt about unsaved changes, because `subscribe` and `dirty` already give an app
what it needs for both.

## Who FormTree Is For

FormTree pays off once a form carries more rules than markup. It fits:

- **Forms that do more than collect values.** Steps that submit on their own, parts that wait for
  an earlier answer, and values that the server has to confirm are declared in the definition. The
  form then reads in one place and behaves the same wherever it is reused.
- **Teams with their own components.** A design system or a component library keeps its markup and
  styles, and its inputs bind to FormTree by the name of a field. Replacing a component never touches a
  rule, and replacing FormTree never touches the design.
- **Rules needed in more than one place.** The same definition validates a request on the server,
  and the same core runs under every adapter, so a rule is written once wherever it applies.

FormTree is not the right fit for:

- **A form with a few inputs and no rules beyond required fields.** The browser already validates
  it, and a library adds code without adding much.
- **Teams that want ready-made, styled form components.** FormTree renders nothing, so a UI library
  gets such a form on screen faster.
- **A form that has to submit without JavaScript.** FormTree keeps the values in its own state and
  never reads the inputs, so the browser alone cannot submit them.
- **An app without a schema library.** FormTree validates through
  [Standard Schema](https://standardschema.dev), so every definition needs a schema from a
  compatible library.

## Still Got Questions?

Open an issue with the [Docs or question](https://github.com/tinas/formtree/issues/new/choose)
template. A question the docs did not answer is a gap we want to fix.
