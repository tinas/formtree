# formtree docs

VitePress 2 (alpha) site in English, written after the Vue docs. `guide/` holds four sidebar sections: Getting Started (Introduction, Quick Start), Essentials (the 80% of forms, read in order), Building the UI (where formtree meets components, one view per framework) and Going Further. `examples/` holds live Vue demos from simplest to most complex, each followed by every file it uses in a code group. `tutorial/` builds one checkout chapter by chapter and starts where Quick Start ends.

| Path                                                                | Role                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `examples/forms/*.ts`                                               | definitions, one file per part (`contact`, `delivery`, `payment`, `line-items`, `promo-code`, composed in `checkout`), and a fake API; used by the demos and, through twoslash `extraFiles`, by guide snippets (`./forms/<name>`); a new file goes into `EXAMPLE_FORMS` in `.vitepress/config.ts`               |
| `examples/demos/*.vue`                                              | live demos, embedded in `examples/*.md` inside `<DemoFrame>`                                                                                                                                                                                                                                                    |
| `examples/components/*.vue`                                         | generic `text-field` / `number-field` / `select-field` / `radio-field` / `checkbox-group-field` built on `useField(name)`                                                                                                                                                                                       |
| `tutorial/steps/<chapter>/`                                         | a chapter's code as it stands at the chapter's end, embedded in its page inside `<DemoFrame class="tutorial-demo">` and shown in its code group; files repeat from chapter to chapter so a reader can start anywhere, and the markup has no classes because `.tutorial-demo` in `theme/style.css` lays it out   |
| `.vitepress/config.ts`                                              | sidebar, twoslash (`ts twoslash` blocks are type-checked at build time), aliases to package sources                                                                                                                                                                                                             |
| `.vitepress/theme/framework*.ts`, `components/framework-select.vue` | the framework select: `?framework=` sets `<html data-framework>` before paint, generated CSS hides the other `*-only` blocks, the choice stays in the URL across routes and `/api/` redirects to the chosen package; a new framework is one entry in each map in `framework.ts`                                 |
| `.vitepress/page-markdown.ts`, `components/copy-page.vue`           | Markdown for agents: at build, each page becomes clean Markdown per framework (`<page>.md` for Vue, `.react.md`, `.javascript.md`) plus `llms.txt` and `llms-full.txt`; in dev a middleware serves the same files. The Copy page button copies the selected framework's file and links it to ChatGPT and Claude |
| `typedoc.json`                                                      | API reference: TypeDoc + typedoc-plugin-markdown + typedoc-vitepress-theme write `api/` (gitignored) before `dev` and `build`; one page per symbol, linked to its source on GitHub at the built commit (`sourceLinkTemplate`); the sidebar is read from `api/typedoc-sidebar.json` at config load               |

The site is deployed on Netlify at https://form-tree.netlify.app. `og:image` is that site's absolute URL, since most link previews ignore a relative one. `public/og-image.png` is rendered from `.vitepress/og-image.html` at 1200×630 with headless Chrome (`--window-size=1200,630 --force-device-scale-factor=1 --allow-file-access-from-files --screenshot`).

`guide/groups.md` states that a schema key is not a child, and the `children` JSDoc repeats it. The option keeps its name: it pairs with `childDeps`, and nesting definitions as `children` matches route trees.

## Writing

- The guide follows the [Vue docs writing guide](https://github.com/vuejs/docs/blob/main/.github/contributing/writing-guide.md). The rules below are how it applies here.
- Docs are plain and leave no open question. They explain concepts, behaviour and reasons, and show them in code.
- A guide section opens with one sentence that names the task and the tool and leads into the code ("Define it with `defineField`, and add it to a group's `children`:"), then says in a sentence or two what the code does. That is the whole section unless the reader needs more to use the feature. Headings are short task names in Title Case ("Defining a Field", "Saving One Row"), never a bare API name. `guide/fields.md` is the model.
- A problem comes first only where the task alone does not show why a feature exists, and then as one sentence, as in Vue's "It can be cumbersome to wire up value bindings by hand. `v-model` simplifies this to:". No scenario stories ("A shop edits a product's price on the product page…"), no edge cases or caveats beyond the section's point, nothing the API reference already says.
- The Introduction is where problems are told at length. There a problem is a situation the reader has lived through, told in plain, general words as one case and what goes wrong in it, ending on the one consequence the reader feels; formtree's features reworded as needs ("a form has to decide when…") are not a problem.
- A section introduces one new concept, in its prose and in its code. A tutorial step brings one API: a sentence on what it is for leads into a small block, then a sentence or two say what it does for the user. A run of sentences each led by an identifier ("`useForm` creates…, `form.field` returns…, `model` goes to…") is line-by-line commentary, so split the step instead.
- A point gets one familiar case, named plainly. A vague mention ("a card on an edit page") leaves the reader guessing, and a second case that repeats the point ("A settings page with a Save button in each section works the same way") is detail.
- The Introduction has no code. It says what formtree is, the problem it solves and the idea behind it, each problem section in prose. Code starts in Quick Start, where the Prerequisites tip above Installation states the knowledge the guide assumes.
- Every sentence earns its place. A page does not restate what the code just showed, has no intro that recaps the sidebar and no "Next" section.
- Prose explains with the idea, not an inventory. It does not list a form's parts, fields or messages ("contact details, a delivery address, and a payment"), since the code shows them, and behaviour beyond the section's point (kept values, focus, trimming) waits for the page that teaches it. One familiar example is enough.
- Prose never lists what can grow or change, such as the supported frameworks, compatible libraries, version ranges or what an object carries. It names the kind ("framework-agnostic", "any Standard Schema library", "the other attributes the input needs") and leaves the rest to the code and the API reference, so a new adapter or attribute needs no prose edit.
- The running text carries only what the section needs: the task, the code, what it does. A side fact a reader may want but does not need to follow the section, such as a shortcut, an alternative or a related detail ("Passing the full path from the root, as in `form.field('address.city')`, returns the same node."), goes in a `::: tip` with a short title. Warnings go in `::: warning`. Callouts stay few and never sit two in a row.
- Prose has few colons. A sentence ends with a colon only when it leads directly into a code block or a list ("Here is a small example:"). An "X: Y" clause inside a sentence becomes two sentences, a "because" or "so" clause, or a comma.
- Lists in prose use the Oxford comma ("the inputs, the layout, and the wording").
- The guide never copies what the API reference lists, such as members, options or defaults. It links to the reference instead.
- No page compares formtree to another library or borrows one as a reference point. A library is named only where an example uses it.
- A child is always an entry of a group's `children`, a node with a definition of its own. A key of a schema is a node too, but prose calls it a key or a lens node, never a child.

## Framework views

- Content that differs per framework sits in `<div class="vue-only">`, `<div class="react-only">` or `<div class="javascript-only">`, with a blank line after the opening tag and before the closing one, or the Markdown inside does not render.
- Vue comes first. It is the default view, and frameworks always appear in the order Vue, React, JavaScript: in the framework select, in prose, in tables and in the source order of the blocks.
- `page-markdown.ts` turns every Markdown extension, container and component the pages use into plain Markdown: twoslash cuts and directives, `<<<` includes, `::: code-group`, callouts, framework blocks, `<script setup>`, code notations (a diff keeps only its new lines) and components such as `<DemoFrame>`. A page that uses a new one needs a case there, or it leaks into what agents copy.
- A heading inside a framework block gets an id that starts with the block's class (`## Inspecting a Form {#vue-only-inspecting-a-form}`), so the page outline hides it in the other views.
- Every example a reader would copy exists in all three views. Where Vue and React use components, the JavaScript view uses functions that take a node.
- A concept snippet that reads the same in every framework sits outside the blocks and imports from `@formtree/core` above `// ---cut---`, so the reader sees no import.
- A full-file example shows its imports. Vue and React import from their adapter package, because adapter users install only the adapter; JavaScript imports from `@formtree/core`.
- The JavaScript view binds inputs with a `bindInput(key)` helper (Quick Start, Submitting the Form): `input` calls `setValue`, `blur` calls `blur()`, and `field.subscribe` writes `errorMessage`.

## Code blocks

- Code blocks are type-checked with twoslash. Setup lines go above `// ---cut---`, and shared definitions are imported rather than repeated. Twoslash resolves only `@formtree/core` and `@formtree/vue`, so React blocks are plain `ts`/`tsx` and Vue SFC blocks plain `vue`; check those by hand against a twoslash-checked twin. A local module in a twoslash block is declared with a hidden `// @filename: api.ts`.
- Type queries (`//    ^?`) go only where the displayed type reads well.
- Hovers add to the page size, so a block whose hovers add nothing starts with `// @noStaticSemanticInfo`. It keeps the type check and drops the hovers.
- Vue templates use `@submit.prevent`.
- A block that repeats an earlier step's code highlights its new lines with fence meta such as `vue{2,6,10-12}`, so the reader sees what the step added.
- A step that replaces code shows a diff instead, so the reader sees what went and what took its place. A line ends with `// [!code --]` or `// [!code ++]`, in a template `<!-- [!code ++] -->`, and an element that spans several lines is marked by `<!-- [!code --:6] -->` on its own line above it.

## Examples

- An example page shows the demo, a few sentences on what to try, then every local file the demo imports, entry component first, so a reader never meets an import they cannot open.
- Example forms are split by part, so each example shows only the files it uses.
- Names read as plain English. A node variable is named after its key (`const delivery = form.group('delivery')`), a key never repeats an API member (`lineItems`, so the code reads `lineItems.items`, never `items.items`), a function says what it does (`savePrice`, not `commit`), and no name shadows another in the same file.
- Every identifier a snippet uses is declared or imported, and a snippet shows a use, not a bare expression statement.

## Tutorial

- The guide says how, the tutorial says why. Each chapter brings the one concept the previous chapter's code makes the reader need, so a feature is met at the moment it solves something, from binding an input by hand to submitting in steps. A chapter that needs more than one new concept is two chapters.
- A chapter opens with what the previous chapter's code leaves to be desired, in two or three sentences. This is the one place outside the Introduction where a problem gets more than a sentence, and it is still not a story.
- A chapter's sections are its steps, each a guide-style section around one small block that marks its change, with highlighted new lines or with a diff where it replaces code. The last section, "Trying the Checkout", shows the demo, a sentence on what to try, and every file of `tutorial/steps/<chapter>/` in a code group, entry component first.
- The code shown in a chapter's steps reads exactly like its files in `tutorial/steps/`, so the reader can compare the two line by line.
- A step may leave something out that a later chapter adds, as binding by hand leaves out the attributes `useField` brings, but no chapter ends on code that is wrong.
- The reason behind a choice the chapter's code relies on, such as why a form is provided rather than passed down, sits in a `::: info` with a short title, right after the sentence that says what the code does.
- The tutorial explains formtree's model in its own terms. It says why nothing is provided implicitly, never how other libraries do it.
