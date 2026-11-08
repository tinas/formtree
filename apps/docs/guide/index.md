# Introduction

## What is formtree?

formtree is a headless, framework-agnostic form library for TypeScript. You describe what a form
holds and which rules it follows, and formtree keeps track of the values, validates them, and hands
the valid result to your submit function. It renders nothing, so how the form looks stays up to
you.

## Why Forms Get Hard

A form usually begins simply. A few inputs, a schema, and a submit handler are sufficient, and the
code remains easy to follow.

As requirements accumulate, the form grows more complex. Errors appear before the user has interacted
with a field, so the component gains a flag to hide them. The next requirement adds another flag, and the
one after it a condition. Eventually the form works as intended, but what it requires can no longer
be determined without reading the entire component.

## A Form Built from Parts

formtree moves the rules of a form out of the component and into a description of the form, called
a definition, leaving the component responsible only for the markup. Because forms are composed of
parts, a definition can contain a smaller definition for each part, each with its own rules. This
nesting is the tree in formtree's name.

Creating a form from a definition turns every part into a node with its own value and errors, and
each node can be validated and submitted independently.

## Submitting a Form in Steps

Long forms are often split into steps. The button that leads to the next step should check only the
current step, not fields the user has not seen yet.

In formtree, each step is a part of the form, so its button can validate and submit just that part.

## Fields That Depend on Another Answer

Some fields matter only after a certain answer. Card details, for example, are needed only when the
customer pays by card, and someone who pays by invoice should not be stopped by an empty card
number.

A definition can say when one of its parts applies. While it does not, the fields in that part are
not validated and are left out of the submitted values.

## Checking a Value with the Server

A sign-up form asks for a username, and only the server can determine whether it is still
available. Checks of this kind are difficult to get right. A response for an earlier value can
arrive last, and the form then displays the result for a name the user has already changed.

In formtree, the check is declared in the definition, alongside the schema. formtree cancels the
request for any value that has since changed, so the response always corresponds to the value on
screen.

## Still Got Questions?

Open an issue with the [Docs or question](https://github.com/tinas/formtree/issues/new/choose)
template. A question the docs did not answer is a gap we want to fix.
