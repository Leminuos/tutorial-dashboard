# Tutorial Dashboard

Tutorial Dashboard is a Vue 3 + Vite documentation browser for tutorial content stored in a GitHub repository. The app reads the remote repository tree, builds navigation models in the browser, and renders tutorials, folder-style document libraries, and post categories.

The current content source is configured in [src/config/github.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/config/github.config.js):

- owner: `Leminuos`
- repo: `tutorials`
- branch: `master`
- optional token: empty by default

## Features

- GitHub-backed documentation tree loaded from the GitHub API.
- Three content layouts: tutorial pages, folder explorer, and posts.
- Markdown rendering with anchors, table of contents, custom containers, KaTeX math, Mermaid support, and syntax highlighting.
- File viewers for Markdown, code, PDF, Excel, PowerPoint, and Word files.
- Search modal built from the generated documentation index.
- Responsive documentation UI with sidebar navigation and mobile table of contents.

## Tech Stack

- Vue 3 with Composition API
- Vue Router using hash history
- Pinia for state management
- Vite for development and builds
- markdown-it, markdown-it-anchor, markdown-it-container, markdown-it-texmath, KaTeX
- Mermaid and Shiki for richer markdown content
- xlsx and docx-preview for Office document viewing

## Requirements

Use Node.js compatible with the project engine field:

```sh
node ^20.19.0 || >=22.12.0
```

Install dependencies:

```sh
npm install
```

## Development

Start the Vite dev server:

```sh
npm run dev
```

Build production assets:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

Run lint and auto-fixes:

```sh
npm run lint
```

Format source files:

```sh
npm run format
```

## Project Structure

```text
src/
  assets/css/        Global and markdown styling
  components/        Shared UI, docs navigation, search, and file viewers
  composables/       Markdown-related composables
  config/            GitHub, Shiki, and supported file type config
  layouts/           Main and document layout wrappers
  router/            Route definitions and navigation guards
  service/           Markdown and Shiki rendering services
  stores/            Pinia stores for docs, search, and theme
  utils/             Shared utilities
  views/             Route-level pages
```

## Runtime Flow

1. [src/App.vue](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/App.vue) creates the application shell and loads the documentation store before first render.
2. [src/stores/docstree.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/stores/docstree.js) fetches the configured GitHub branch ref, recursively loads the repository tree, reads `.docconfig.json`, and builds the in-memory docs tree.
3. [src/router/index.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/router/index.js) validates routes against the generated tree before entering content pages.
4. Route views render the selected content using Markdown and file viewer components.

## Routes

The app uses hash routing, so deployed URLs look like `/tutorial-dashboard/#/...`.

- `#/` - home page
- `#/explorer` - file explorer landing page
- `#/docs/:section` - redirects tutorial sections to their first page
- `#/docs/:section/:chapter/:page` - tutorial page
- `#/:section` - folder document root
- `#/:section/:path+` - folder document path
- `#/posts/:category(.*)` - post category list
- `#/posts/view/:section/:path+` - post detail

## Content Model

Content comes from the configured GitHub repository. Top-level folders become documentation sections. The layout for each section is read from the remote `.docconfig.json`; sections default to `tutorial` when no layout is specified.

Supported layouts:

- `tutorial`: chapter/page hierarchy for guided documentation.
- `folder`: file explorer style browsing.
- `posts`: category and post browsing driven by `posts.json`.

See [docs/CONTENT_MODEL.md](D:/Tutorial/Web/6.Project/tutorial-dashboard/docs/CONTENT_MODEL.md) for details.

## Deployment Notes

[vite.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/vite.config.js) sets `base` to `/tutorial-dashboard/`, so production assets are built for that subpath. Change `base` if the app is deployed under a different path.

The app fetches content directly from GitHub in the browser. For private repositories or higher API limits, configure a token in [src/config/github.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/config/github.config.js). Do not commit real private tokens.

## Known Maintenance Notes

- Keep source files encoded as UTF-8. Some existing Vietnamese strings show mojibake, so fix affected text carefully when editing nearby UI copy.
- Route guards depend on the generated docs tree. When changing tree shape or slug rules, verify tutorial, folder, and posts routes.
- `npm run lint` uses `--fix`; review modified files after running it.
