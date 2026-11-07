# Introduction

## What is formtree?

formtree is a headless, framework-agnostic form library for TypeScript. You describe what a form
holds and which rules it follows, and formtree keeps track of the values, validates them, and hands
the valid result to your submit function. It renders nothing, so how the form looks stays up to
you.

## Why Forms Get Hard

Most forms start simple. A few inputs, a schema, and a submit handler are enough, and the code is
easy to follow.

Then the form grows. Errors show up before the user has finished typing, so the component gets a
flag to hide them. The next request adds another flag, and the one after that a condition. Soon the
form works, but nobody can tell what it requires without reading the whole component.

## A Form Built from Parts

formtree moves the form's rules out of the component and into a description of the form, called a
definition, and leaves the component with the markup. Forms are made of parts, so a definition can
hold a smaller definition for each part, each with its own rules. That nesting is the tree in
formtree's name.

When you create a form from a definition, every part becomes a node with its own value and errors,
and each node can be validated and submitted on its own.

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

A sign-up form asks for a username, and only the server knows whether it is still free. Checks like
this are easy to get wrong. An answer for an older value can arrive last, and the form shows the
result for a name the user has already changed.

In formtree, the check lives in the definition, next to the schema. formtree cancels the request
for a value that has changed, so the answer always belongs to what is on the screen.

## Still Got Questions?

Open an issue with the [Docs or question](https://github.com/tinas/formtree/issues/new/choose)
template. A question the docs did not answer is a gap we want to fix.
