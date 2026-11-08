# formtree

Headless form tree. `packages/core` is the framework-agnostic engine, `packages/vue` and `packages/react` the adapters, and `apps/docs` the documentation site. `apps/playground` drives the core with plain DOM code; `apps/vue-playground` and `apps/react-playground` build the same wizard with Vue SFCs and React components. `benchmarks` measures the core and both adapters.

The contributor workflow lives in @CONTRIBUTING.md. This file holds what applies across the repo: the design rules, what is left out on purpose, the conventions review holds code to, releases and tooling. `packages/core`, `packages/vue`, `packages/react` and `apps/docs` each keep a `CLAUDE.md` with their architecture, their decisions and their gotchas. A path, name or value that the code already shows stays out of all of them.

## Design rules

1. State does not depend on rendering. Mounting or unmounting a component never changes a value, an error or a registration.
2. Types come from schemas, not values. A form holds `DraftOf<definition>` and a handler receives `OutputOf<definition>`; an initial value fits the draft and need not be complete.
3. A node is found by identity, by its path or, in an adapter, by its definition. There is no "nearest form" lookup.
4. Every error has one producer (schema, `validate`, `validateAsync` or the server), and each changes only its own errors.
5. Validation runs on every change; `mode` only decides visibility.
6. An inactive branch is not validated and is not in the output, but its value is kept.
7. Empty is `undefined`, structure always exists. Declared groups are `{}` and declared arrays `[]` from the start, and the library invents no other value, so `push({})` adds an empty row.
8. An array item is identified by its key, not its index.
9. A submit runs a fixed pipeline; a node already submitting or in an inactive branch returns `'skipped'`.
10. Dependencies flow down, explicitly: parent to child, never between siblings or upwards.

## Left out on purpose

- Components, renderless fields and directives. Elements belong to the app.
- `canSubmit`. An invalid form keeps its button enabled, and edit forms gate on `dirty`.
- Unregistering on unmount (rule 1).
- `null` for empty, and drafts filled from schema defaults (rule 7).
- Adapters per schema library. Standard Schema only.
- Wildcard paths for async rules. A check belongs to its definition.
- Dependencies between siblings (rule 10).
- Built-in messages. `formatError` turns codes into text.
- Persistence and unsaved-changes prompts. `subscribe` and `dirty` are enough.
- A `watch` API. `subscribe`, `node.state` and the framework's own watch cover it.
- Narrowing the output by the answer that turns a part on. A getter's `boolean` does not tell the types which answer, and patterns, key helpers or predicates inferred in the getter's context each add a form or type machinery to maintain, so a part `activeWhen` turns on stays optional and the submit function checks it.
- Parsing `FormData` to submit without JavaScript. formtree keeps the draft in its own state and never reads the inputs, and the server validates the JSON output with the same definition, as `guide/submitting.md` shows.
- Warnings that do not block a submit. Every error keeps `valid` false and stops a submit (rule 4), so a warning is text the app derives from `state.value`, as `guide/showing-errors.md` says.
- A `required` option on definitions. The schema is the one source of `state.required`, so the app marks a field that a group's `validate` rule or another answer in the same schema requires.

## Recording a decision

A decision goes into the `CLAUDE.md` of the package it shapes: what the code does, why in a sentence or two, and the test that guards it, named in quotes with its file. The test fails when the behaviour breaks; break the source, run it, restore. What an earlier version did, measurements and the discussion that led there belong in the pull request.

## Code conventions

- No comments. Names and structure carry the meaning.
- The one exception is short JSDoc on the public API, which is what each package exports from its entry.
  - Every export has a `@category`, which groups the API reference.
  - A summary goes only where the name and type do not say it. Behaviour that surprises, such as throwing, skipping or keeping values, goes there.
  - An option with a default has a `@defaultValue`. There is no `@param`, `@returns` or `@example`, because examples live in the guide.
  - Plumbing that only the adapters use is `@internal`.
- Functions take an object parameter once their arguments stop being obvious.
- Loose equality (`==`, `!=`) unless identity matters (`Object.is`).
- Behaviour that differs per kind lives in an exhaustive table, not in `kind == 'x'` branches.
- String domain values are `as const` objects with a derived type.
- Definitions are values, not components. They are camelCase with a kind suffix, such as `emailField`, `deliveryGroup` or `lineItemsArray`. A definition used as the root of a form ends with `Form` instead (`signUpForm`), so `useForm(signUpForm)` reads as a sentence; the suffix names what the definition is used as. PascalCase stays for types, interfaces and components.
- Components never receive nodes through props. A business component reads its node with `useFormNode(Definition)`, a generic input takes a `name` and a row takes an `index`.
- React components live in kebab-case `.tsx` files with named exports.
- A constant used by one file stays in that file. Only a package's entry re-exports.
- Relative imports have no extension.
- Type-only modules are `.ts`, never `.d.ts`, since `skipLibCheck` would hide their errors.
- Examples, playgrounds and tests use everyday domains, such as a checkout or account roles, never search-ads-ui terms.

## Releases

- Maintainers write the changesets, on a contributor's PR too, for any change to a published package's API or behaviour; docs, playgrounds and tests need none. `@formtree/*` is a `fixed` group, so every package shares one version, and a change to core's public API lists core, vue and react with the same bump.
- The Changesets config has `format: false` because the formatter is `vp fmt`, configured in `vite.config.ts` where Changesets cannot find it; `pnpm version-packages` runs `changeset version && vp fmt`.
- The changelog reads GitHub, so a local `pnpm version-packages` needs `GITHUB_TOKEN=$(gh auth token)`.
- A prerelease starts with `pnpm changeset pre enter <tag>` and ends with `pnpm changeset pre exit`. The stable changelog is built from `.changeset/pre/`, so trim those files to what matters for the stable version first.
- The CI job is named `ci` because the `main` ruleset requires a check with that name; a rename blocks every merge without bypass.
- npm auth is trusted publishing (OIDC), no token: each `@formtree/*` package trusts `tinas/formtree` and `release.yml`. Only the `publish` job has `id-token: write`.
- pnpm adds provenance on its own for a public repo, and provenance fails unless the package's `repository` (with `directory`) matches the repo; every package declares it.
- npm lets a package trust a workflow only once it exists: a new package is published once by hand (`pnpm release`), then `npm trust github <name> --file release.yml --repo tinas/formtree --allow-publish`, or the same on the package's Trusted Publisher settings with no environment and "Allow npm publish" ticked. Without that permission npm allows only staged publishes, and `publish` fails with `E403 OIDC permission denied for this action`.
- The version PR is opened with the Actions token, so GitHub holds CI on it until it is approved ("Approve and run workflows"); `pack` runs `vp run ready` before anything is published either way.
- `changeset-status.yml` runs on `pull_request_target` so fork PRs get the comment; it checks out and reads, never runs the PR's code.
- Actions are pinned to commit SHAs with the tag in a comment; Dependabot groups their updates monthly. `setup-vp` takes Node from `engines.node` (the newest release in the range), Vite+ from the catalog and pnpm from `devEngines`.

## Tooling

- Packages use TypeScript 7 (tsgo). `apps/vue-playground` and `apps/docs` pin TypeScript ~5.9: vue-tsc and TypeDoc need the TypeScript JS API, which TS 7 does not have.
- `vp check` does not type-check `.vue` files; builds that contain SFCs run `vue-tsc --noEmit` first.
- Apps resolve package sources through tsconfig `paths` and Vite `resolve.tsconfigPaths`, so dev needs no build, and type checks and runtime see the same file.
- `packages/vue` and `packages/react` pack with `tsconfig.build.json` (no `paths`), so their `.d.ts` imports `@formtree/core` instead of inlining it; `vp run -r build` packs core first.
- React files are `.tsx` with `jsx: react-jsx`; `vp check` type-checks them, so the React playground builds with plain `vp build`. Tests use `@testing-library/react` in happy-dom and call `cleanup` in `afterEach`. `apps/docs/tsconfig.typedoc.json` sets `jsx` for TypeDoc.
- VitePress builds every Markdown file in `apps/docs`, so `srcExclude` keeps `apps/docs/CLAUDE.md` off the site.
- The published declarations use `NoInfer`, so apps need TypeScript 5.4 or later; TypeScript 5.2 fails on them. Every package states it with an optional `typescript` peer, its README and Quick Start's prerequisites, and a top-level `types` field lets `moduleResolution: node` find the declarations. Raising the floor changes all of them.
- `benchmarks` holds Vitest 5 benchmarks (a `test` with the `bench` fixture) that import the package sources through tsconfig `paths`, and `vp run bench` runs them. Its `bench` task sets `cache: false`, because the root caches scripts and a replayed benchmark measures nothing.
- Benchmarks run only on demand, because timings on shared CI runners vary too much to compare. A cost that must not grow is guarded by a test in `vp run ready` instead, either a count, such as how often a schema runs, or the ratio of two sizes measured in one run.

## Open work

- Hover types are hard to read: nested drafts and outputs show as `Simplify<DraftObject<…> & {} & {…}>`, group nodes as `GroupNode<GroupDefinitionOf<…>>`. Until that is fixed, docs use `//    ^?` only where the type reads well.
- Playgrounds and docs demos have only been checked with scripted headless Chrome flows; the React playground only for a clean first render, since the repo has no browser driver.
- Point the devtools `logo` at the docs site's logo (https://form-tree.netlify.app/logo.svg) instead of the bundled `dynamic_form` icon.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
