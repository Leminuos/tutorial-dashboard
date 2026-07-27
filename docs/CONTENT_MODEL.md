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
- Every `toctree` entry is either a path string or an object with `path` plus optional `title` and `id`.
- Section entries point at chapter folders; each chapter folder needs its own `index.json`.
- A page entry pointing at a folder resolves to `<folder>/README.md`; a page entry ending in `.md` resolves to that file.
- Entries whose target file does not exist are skipped with a console warning; chapters with no resolvable page are dropped.
- Order is the declaration order in the toctree. Numeric prefixes no longer control ordering, but they are still stripped from generated titles and slugs.
- Titles come from the entry `title`, then the target `index.json` `title`, then the folder name.
- Page slugs come from the entry `id`, otherwise from the last path segment. Keeping folder names stable keeps existing URLs stable.

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
