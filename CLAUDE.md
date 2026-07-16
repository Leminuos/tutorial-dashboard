# CLAUDE.md

This file gives coding agents the project-specific context needed to work safely in this repository.

## Project Overview

This is a Vue 3 + Vite documentation dashboard. The app does not keep documentation content in this repo; it fetches a remote GitHub repository in the browser and builds navigation from that repository tree.

Current source repository config:

- File: [src/config/github.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/config/github.config.js)
- Owner: `Leminuos`
- Repo: `tutorials`
- Branch: `master`

## Important Commands

```sh
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run format
```

Notes:

- `npm run lint` runs ESLint with `--fix`; inspect the diff after running it.
- `npm run format` currently formats `src/` only.
- Vite is configured with `base: "/tutorial-dashboard/"`.

## Architecture Map

- [src/main.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/main.js): creates Vue app, installs Pinia and router.
- [src/App.vue](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/App.vue): loads docs store and renders the active route layout.
- [src/router/index.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/router/index.js): route definitions, route guards, and docs loading guard.
- [src/stores/docstree.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/stores/docstree.js): GitHub fetch logic, docs tree builder, raw URL builder, and content lookup helpers.
- [src/stores/searchStore.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/stores/searchStore.js): builds and queries a client-side search index.
- [src/service/markdown/createMarkdownRenderer.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/service/markdown/createMarkdownRenderer.js): markdown-it configuration, custom containers, anchors, TOC extraction, math, and relative image resolution.
- [src/components/viewers/FileViewer.vue](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/components/viewers/FileViewer.vue): dispatches files to the correct viewer component.
- [src/config/fileTypes.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/config/fileTypes.config.js): supported file extension mapping.

## Routing Rules

The app uses hash routing.

- `#/` renders home.
- `#/explorer` renders the file explorer landing page.
- `#/docs/:section/:chapter/:page` renders tutorial pages.
- `#/:section` and `#/:section/:path+` render folder layout sections.
- `#/posts/:category(.*)` renders post category lists.
- `#/posts/view/:section/:path+` renders post details.

Route guards validate against the generated docs tree. If you change tree generation, slugging, or route params, test all three content layouts.

## Content Rules

Top-level folders in the remote content repo become sections. The remote `.docconfig.json` can set each section layout:

- `tutorial`
- `folder`
- `posts`

If no layout is configured, the section defaults to `tutorial`.

See [docs/CONTENT_MODEL.md](D:/Tutorial/Web/6.Project/tutorial-dashboard/docs/CONTENT_MODEL.md) before changing docs tree behavior.

## Coding Conventions

- Use Vue 3 Composition API and `<script setup>` for Vue components.
- Use the `@` alias for imports from `src`.
- Keep indentation at 2 spaces.
- Keep source files UTF-8 with LF endings.
- Prefer existing Pinia stores and helper functions instead of duplicating GitHub or tree lookup logic.
- Add new file types in [src/config/fileTypes.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/config/fileTypes.config.js) and update viewer dispatch in [src/components/viewers/FileViewer.vue](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/components/viewers/FileViewer.vue).
- Keep route validation in sync with any new layout or URL pattern.

## Encoding Warning

Some existing Vietnamese UI strings appear mojibaked. When editing nearby text, preserve UTF-8 and fix affected strings deliberately. Do not introduce new mojibake by saving files with a legacy encoding.

## Validation Checklist

After meaningful changes, run:

```sh
npm run build
```

For lint-sensitive edits, also run:

```sh
npm run lint
```

Manual checks to cover when UI or routing changes:

- Home page lists tutorial and post sections.
- Tutorial route loads a markdown page and table of contents.
- Folder route opens nested folders and file modal.
- Post category route loads `posts.json`.
- Post detail route renders markdown or folder `README.md`.
- Search modal opens and returns results after docs load.

## Safety Notes

- Do not commit real GitHub tokens.
- Do not hardcode remote content paths when `buildRawUrl` or tree lookup helpers can be used.
- Do not assume local docs content exists; most user-facing content is remote.
- Be careful with changes to `slugify`; route stability depends on it.
