# Content Model

This project does not store tutorial content locally. It reads the configured GitHub repository at runtime and converts repository paths into UI navigation data.

## Source Repository

The source repository is configured in [src/config/github.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/config/github.config.js).

```js
export default {
  github: {
    owner: "Leminuos",
    repo: "tutorials",
    branch: "master",
    token: ""
  }
}
```

The docs store uses:

- GitHub refs API to resolve the branch SHA.
- GitHub tree API with `recursive=1` to list all files.
- Raw GitHub URLs to fetch markdown, metadata, and attachments.

## Section Layouts

Each top-level folder in the content repository becomes a documentation section. The optional remote `.docconfig.json` can assign a layout per top-level folder.

```json
{
  "Linux Kernel": { "layout": "tutorial" },
  "Datasheets": { "layout": "folder" },
  "Embedded": { "layout": "posts" }
}
```

If a section has no config, it defaults to `tutorial`.

## Tutorial Layout

Tutorial sections are ordered learning paths. **Navigation is declared, not inferred**: the sidebar comes from `index.json` files in the content repository, the same way Sphinx projects use `index.rst` toctrees. Repository paths only supply page assets.

Expected shape:

```text
Section Name/
  index.json                  <- section toctree (lists chapters)
  01. Chapter Name/
    index.json                <- chapter toctree (lists pages)
    01. First Page/
      README.md
      img/
        diagram.png
      example/
        Example Name/
          main.c
      attachment.pdf
    02. Extra Page.md
```

Section `index.json`:

```json
{
  "title": "Linux Kernel",
  "description": "Optional section summary",
  "toctree": ["1. Get started", "2. OS"]
}
```

Chapter `index.json`:

```json
{
  "title": "Driver",
  "toctree": [
    { "path": "1. kernel_module", "title": "Kernel Module" },
    {
      "path": "2. device_driver",
      "title": "Device Driver",
      "examples": ["example/char_device"]
    },
    { "path": "2. device_driver/notes.md", "title": "Extra Notes" }
  ]
}
```

Rules implemented by [src/stores/docstree.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/stores/docstree.js):

- A tutorial section **must** have `index.json` at its root. Without it the section renders empty and `doc.error` is set.
- Every `toctree` entry is either a path string or an object with `path` plus optional `title` and `id`, or a redirect entry (see below).
- Section entries point at chapter folders; each chapter folder needs its own `index.json`.
- A page entry pointing at a folder resolves to `<folder>/README.md`; a page entry ending in `.md` resolves to that file.
- Entries whose target file does not exist are skipped with a console warning; chapters with no resolvable page are dropped.
- Order is the declaration order in the toctree. Numeric prefixes no longer control ordering, but they are still stripped from generated titles and slugs.
- Titles come from the entry `title`, then the target `index.json` `title`, then the folder name.
- Page slugs come from the entry `id`, otherwise from the last path segment. Keeping folder names stable keeps existing URLs stable.

### Redirect Entries

Any toctree entry — a chapter in the section `index.json` or a page in a chapter `index.json` — can declare `redirect` instead of owning content. Clicking it in the sidebar sends the reader to the document named by `redirect`; the entry itself needs no `index.json` and no `README.md`.

```json
{
  "title": "Driver",
  "toctree": [
    { "path": "1. kernel_module", "title": "Kernel Module" },
    { "title": "Scheduler (xem ở Linux Kernel)", "redirect": "Linux Kernel/2. OS/3. scheduler" }
  ]
}
```

Rules:

- `redirect` is a path in the **content repository**, not an app route. It may name a page folder, a page markdown file, a chapter folder, or a whole section; a chapter or a section resolves to its first page.
- `path` becomes optional on a redirect entry. When it is omitted, the entry `id` and `title` are derived from the redirect target, so give redirect entries an explicit `title` (and an `id` if the generated slug matters).
- Redirect entries are skipped by search, by the previous/next footer, and by the `#/docs/:section` landing redirect, because they have no page of their own.
- Opening a redirect entry's own URL directly forwards to the target as well.
- An unresolvable `redirect` logs a warning and renders as plain text in the sidebar.
- A `redirect` naming a repo file that is not a page (a PDF, an image) opens that file's raw URL in a new tab. An `http(s)://` value is used as-is.

### Cross-Document Links In Markdown

Markdown links can point at another document of the content repository. [src/service/markdown/createMarkdownRenderer.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/service/markdown/createMarkdownRenderer.js) rewrites them to in-app routes, so the reader stays inside the SPA instead of leaving for github.com.

```md
[3.4](<Linux Kernel/2. OS/3. scheduler>)
[3.4](Linux%20Kernel/2.%20OS/3.%20scheduler#lap-lich)
[3.4](../../2.%20OS/3.%20scheduler)
[Spec](<Linux Kernel/spec.pdf>)
```

Rules:

- Paths are resolved the same way as `redirect`: first as a repo path from the repository root, then relative to the folder of the document holding the link. A leading `/` always means "from the repository root".
- **A link destination containing spaces must be wrapped in `<>` or written with `%20`.** CommonMark does not accept bare spaces inside `(...)`, so `[3.4](Linux Kernel/2. OS)` is not a link at all.
- A trailing `#anchor` is carried over to the target page.
- Comparison is case-insensitive, and `/README.md` is optional on folder pages.
- A link to a repo file with no page of its own becomes a raw URL opened in a new tab; absolute URLs and `#anchor` links are left untouched.
- A path that resolves to nothing is left exactly as written.

Page assets:

- `examples`: list of folders relative to the page folder, as `"example/char_device"` or `{ "name": "I2C", "path": "example/i2c_driver" }`. All files below the folder become the example files.
- `attachments`: list of files relative to the page folder.
- If neither is declared and the entry is a folder page, assets are auto-collected: `example/*` subfolders become examples, and remaining non-markdown, non-image files outside `img/` become attachments.
- Markdown-file entries share a folder with sibling pages, so they never auto-collect; declare their assets explicitly.

Tutorial URLs:

```text
#/docs/:section/:chapter/:page
```

## Folder Layout

Folder sections preserve the repository folder tree and expose files through a file explorer UI.

Expected shape:

```text
Section Name/
  Folder A/
    file.md
    schematic.pdf
  Folder B/
    firmware.c
```

Rules:

- Every nested folder becomes a folder card.
- Every supported file becomes a file card.
- Folder routes are validated against the generated tree.

Folder URLs:

```text
#/:section
#/:section/:path+
```

## Posts Layout

Post sections combine a folder tree with category metadata loaded from `posts.json`.

Expected category shape:

```text
Posts Section/
  Category Name/
    posts.json
    first-post/
      README.md
      img/
        cover.png
    second-post.md
```

`posts.json` can be an object with a `posts` array:

```json
{
  "description": "Category description",
  "posts": [
    {
      "id": "first-post",
      "title": "First Post",
      "description": "Short summary",
      "date": "12-07-2026",
      "author": "Author",
      "tags": ["esp32", "embedded"],
      "image": "first-post/img/cover.png"
    }
  ]
}
```

It can also be a dictionary where object keys become post ids after slugification.

Rules:

- Post category metadata is fetched lazily per category.
- Image files and `img` folders are skipped in posts navigation.
- A post detail can point to a markdown file or to a folder containing `README.md`.
- Related posts are matched by shared tags within the same category.

Post URLs:

```text
#/posts/:category
#/posts/view/:section/:path+
```

## Slugs and Titles

Slugs are generated by [src/utils/slugify.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/utils/slugify.js). File and folder titles are generated from names by:

- Removing leading numeric order prefixes.
- Replacing underscores with spaces.
- Title-casing words.

Because route validation uses generated slugs, changes to slug behavior can break existing links.

## Supported File Types

Supported file types are declared in [src/config/fileTypes.config.js](D:/Tutorial/Web/6.Project/tutorial-dashboard/src/config/fileTypes.config.js).

- Markdown: `.md`
- PDF: `.pdf`
- Excel: `.xlsx`, `.xls`
- PowerPoint: `.pptx`, `.ppt`
- Word: `.doc`, `.docx`
- Code: C/C++, Python, JSON, TXT, YAML, shell, HTML, Kotlin, INI, CMake, DTS, and Makefile
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico`

Unknown file types show a download prompt instead of an inline viewer.
