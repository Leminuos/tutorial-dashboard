import { defineStore } from 'pinia'
import config from '@/config/github.config.js'
import { slugify } from '@/utils/slugify'

const OWNER     = config.github.owner  || "YOUR_OWNER"
const REPO      = config.github.repo   || "YOUR_REPO"
const BRANCH    = config.github.branch || "master"
const TOKEN     = config.github.token  || ""

export const useDocsStore = defineStore('docs', {

  state: () => ({
    tree: null,
    flatLists: null,
  }),

  getters: {},

  actions: {
    async load() {

      // 1) Fetch branch ref -> sha
      const refJson = await fetchGithubToJson(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`
      )

      const sha = refJson?.object?.sha

      // 2) Fetch tree recursive
      const treeJson = await fetchGithubToJson(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${sha}?recursive=1`
      );

      const paths = (treeJson.tree || [])
          .filter(x => x.type === "blob" && typeof x.path === "string")
          .map(x => x.path)

      // 3) Filter markdown
      const mdFiles = paths.filter(p => p.toLowerCase().endsWith(".md"))

      // 4) Write JSON
      this.tree = buildDocsTree(mdFiles)

      this.flatLists = flatPages(this.tree)
    },
  }
})

function createGithubHeader() {
  const header = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "docs-tree-generator"
  };

  if (TOKEN) header["Authorization"] = `Bearer ${TOKEN}`;
  return header;
}

async function fetchGithubToJson(url) {
  const res = await fetch(url, { headers: createGithubHeader() });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status} ${res.statusText}\n${url}\n${text}`);
  }

  return res.json();
}

function titleFromFilename(filename) {
  const base = filename.replace(/\.md$/i, "")

  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildDocsTree(mdFiles) {
  const sets = new Map()

  for (const md of mdFiles) {
    const parts = md.split("/")
    if (parts.length !== 4) continue
    const docName = parts[0]
    const chapterName = parts[1].replace(/^\d+\s*[\.\-_]\s*/, "")
    const fileName = parts[2].replace(/^\d+\s*[\.\-_]\s*/, "")

    const pageId = slugify(fileName)
    const pageTitle = titleFromFilename(fileName)

    if (!sets.has(docName)) sets.set(docName, new Map());
    const chapters = sets.get(docName);

    if (!chapters.has(chapterName)) chapters.set(chapterName, []);
    chapters.get(chapterName).push({
      id: pageId,
      title: pageTitle,
      path: md
    });
  }

  const docs = [];
  for (const [setName, chaptersMap] of sets) {
    const chapters = []

    for (const [chapterName, pages] of chaptersMap) {
      chapters.push({
        id: slugify(chapterName),
        title: chapterName,
        pages
      });
    }

    docs.push({
      id: slugify(setName),
      title: setName,
      chapters
    })
  }

  return { docs };
}

function flatPages(docsTree) {

  const items = []

  for (const d of docsTree.docs) {
    const sectionId = d.id || ''
    const chapters = Array.isArray(d.chapters) ? d.chapters : []

    for (const ch of chapters) {
      const chapterId = ch.id || ''
      const pages = Array.isArray(ch.pages) ? ch.pages : []

      for (const p of pages) {
        const pageId = p.id || ''

        items.push({
          sectionId,
          chapterId,
          pageId,
          title: p.title || pageId,
          path: p.path || '',
          to: `/docs/${sectionId}/${chapterId}/${pageId}`,
        })
      }
    }
  }

  return items
}
