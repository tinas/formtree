# Contributing to formtree

formtree is an open source project, and we welcome contributions of all kinds, from answering a question to sending a pull request.

## How to contribute

### Help out in issues

Answering a question, sharing a workaround or turning a bug report into a smaller reproduction helps as much as code does. Have a look at the [open issues](https://github.com/tinas/formtree/issues).

### Open an issue

Search the existing issues first, then pick one of the templates. For a bug, a small reproduction is the most useful thing you can give us. If the docs left you with a question, the "Docs or question" template is the place for it.

### Send a pull request

We're always happy to see a pull request.

#### Before you start

If you're fixing a bug, check whether an issue describes it. The behaviour may be intended, or the issue may hold context that helps.

If you're working on a feature or a change to how formtree works, open a feature request first and wait for a maintainer to confirm it. That way we agree on the design before you spend time on the code.

#### Set up the repository

The repository holds three packages, `@formtree/core`, the framework-agnostic engine, and the `@formtree/vue` and `@formtree/react` adapters.

1. Fork the repository and clone your fork.
2. Install [Vite+](https://viteplus.dev/guide/). Its `vp` command also sets up the Node.js and pnpm versions the repository needs.
3. Install the dependencies with `vp install`.
4. Create a branch for your change, such as `fix/moved-row-errors`.

```sh
vp run dev         # playground with the core and plain DOM code
vp run dev:vue     # playground with the Vue adapter
vp run dev:react   # playground with the React adapter
vp run docs        # documentation site
vp run ready       # format, lint, type check, tests and builds, as in CI
```

#### Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org). Use `fix:` and `feat:` for changes to the code, and `docs:` or `chore:` for documentation and typos.

When your change touches a package, put its name in the scope, as in `fix(vue): …`. For several packages, separate them with a comma, as in `feat(core,vue,react): …`. Changes outside the packages, like the docs site or CI, have no scope.

#### Making the pull request

We squash and merge pull requests, so the title becomes the commit message. Please write it in the same format as a commit. It's fine to have several commits in a pull request, and there's no need to rebase or force push.

- If your pull request fixes an issue, mention it in the description.
- If you change how formtree behaves, add a test that fails without your change and update the docs page that describes the behaviour.
- Make sure `vp run ready` passes before you open the pull request.
- Keep the pull request to one thing, without unrelated changes such as formatting elsewhere in a file.
- Leave versions, changelogs and changesets to us. Maintainers handle releases.
- Keep edits by maintainers allowed, so we can make small fixes before merging.

#### Once you've made a pull request

We'll review it as soon as we can. If we ask for changes, it doesn't mean the pull request is bad. It's part of getting it ready to merge.
