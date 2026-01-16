import { defineStore } from 'pinia'
import config from '@/config/github.config.js'
import { getFileType, isExampleFolder } from '@/config/fileTypes.config.js'
import { slugify } from '@/utils/slugify'

const OWNER = config.github.owner || "YOUR_OWNER"
const REPO = config.github.repo || "YOUR_REPO"
const BRANCH = config.github.branch || "master"
const TOKEN = config.github.token || ""

export const useDocsStore = defineStore('docs', {

  state: () => ({
    tree: null,
    flatLists: null,
    docConfig: null,
    loading: false,
    error: null,
  }),

  getters: {
    sidebarDocs: (state) => state.tree?.docs?.filter(d => d.layout === 'sidebar') || [],
    dropdownDocs: (state) => state.tree?.docs?.filter(d => d.layout === 'dropdown') || [],
  },

  actions: {
    async load() {
      if (this.loading) return
      this.loading = true
      this.error = null

      try {
        // 1) Fetch branch ref -> sha
        const refJson = await fetchGithubToJson(
          `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`
        )
        const sha = refJson?.object?.sha

        // 2) Fetch tree recursive (all files)
        const treeJson = await fetchGithubToJson(
          `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${sha}?recursive=1`
        )

        const allPaths = (treeJson.tree || [])
          .filter(x => x.type === "blob" && typeof x.path === "string")
          .map(x => x.path)

        // 3) Fetch .docconfig.json from root
        this.docConfig = await fetchDocConfig()

        // 4) Build docs tree based on config
        this.tree = buildDocsTree(allPaths, this.docConfig)

        // 5) Build flat lists for navigation
        this.flatLists = flatPages(this.tree)

      } catch (err) {
        this.error = err.message
        console.error('Failed to load docs:', err)
      } finally {
        this.loading = false
      }
    },

    /**
     * Get doc by section id
     */
    getDocById(sectionId) {
      return this.tree?.docs?.find(d => d.id === sectionId) || null
    },

    /**
     * Get page data for sidebar docs
     */
    getSidebarPage(sectionId, chapterId, pageId) {
      const doc = this.getDocById(sectionId)
      if (!doc || doc.layout !== 'sidebar') return null

      const chapter = doc.chapters?.find(c => c.id === chapterId)
      if (!chapter) return null

      return chapter.pages?.find(p => p.id === pageId) || null
    },

    /**
     * Get subcategory data for dropdown docs
     */
    getDropdownSubcategory(sectionId, categoryId, subcategoryId) {
      const doc = this.getDocById(sectionId)
      if (!doc || doc.layout !== 'dropdown') return null

      const category = doc.categories?.find(c => c.id === categoryId)
      if (!category) return null

      return category.subcategories?.find(s => s.id === subcategoryId) || null
    }
  }
})

// ============ Helper Functions ============

function createGithubHeader() {
  const header = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "docs-tree-generator"
  }
  if (TOKEN) header["Authorization"] = `Bearer ${TOKEN}`
  return header
}

async function fetchGithubToJson(url) {
  const res = await fetch(url, { headers: createGithubHeader() })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`GitHub API error ${res.status} ${res.statusText}\n${url}\n${text}`)
  }

  return res.json()
}

/**
 * Fetch .docconfig.json from repo root
 */
async function fetchDocConfig() {
  try {
    const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/.docconfig.json`
    const res = await fetch(url, { headers: createGithubHeader() })

    if (!res.ok) {
      console.warn('.docconfig.json not found, using default config')
      return {}
    }

    return res.json()
  } catch (err) {
    console.warn('Failed to fetch .docconfig.json:', err)
    return {}
  }
}

/**
 * Extract title from filename, removing order prefix
 */
function titleFromFilename(filename, isFile = false) {
  // Only remove extension if it's explicitly a file and has a typical extension
  let base = filename
  if (isFile) {
    base = filename.replace(/\.[a-z0-9]{2,4}$/i, "")
  }

  // Remove order prefix like "1. " or "01-" or "1_" at the start.
  // This matches digits followed by optional dot/space/dash/underscore.
  const withoutOrder = base.replace(/^\d+[.\s\-_]*/, "")

  // Convert to title case, replace dashes/underscores with spaces.
  const text = withoutOrder
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!text) return base // Fallback if entire name was numeric

  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Extract order number from filename
 */
function extractOrder(filename) {
  const match = filename.match(/^(\d+)\s*[\.\-_]/)
  return match ? parseInt(match[1], 10) : 999
}

/**
 * Build raw GitHub URL for a file
 */
export function buildRawUrl(path) {
  const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encodedPath}`
}

/**
 * Build docs tree from all file paths
 */
function buildDocsTree(allPaths, docConfig) {
  const docsMap = new Map()

  for (const path of allPaths) {
    const parts = path.split('/')
    if (parts.length < 2) continue

    const docName = parts[0]

    // Skip hidden files/folders
    if (docName.startsWith('.')) continue

    const layout = docConfig[docName]?.layout || 'sidebar'

    if (!docsMap.has(docName)) {
      docsMap.set(docName, {
        id: slugify(docName),
        title: titleFromFilename(docName),
        layout,
        rawName: docName,
        files: []
      })
    }

    docsMap.get(docName).files.push(path)
  }

  const docs = []

  for (const [docName, docData] of docsMap) {
    if (docData.layout === 'sidebar') {
      docs.push(buildSidebarDoc(docData))
    } else {
      docs.push(buildDropdownDoc(docData))
    }
  }

  return { docs }
}

/**
 * Build sidebar doc structure
 * Structure: Doc > Chapter > Page (with examples and attachments)
 */
function buildSidebarDoc(docData) {
  const chaptersMap = new Map()

  for (const filePath of docData.files) {
    const parts = filePath.split('/')

    // Support: DocName/ChapterName/PageName.md (length 3)
    // Support: DocName/ChapterName/PageFolderName/README.md (length 4)
    if (parts.length < 3) continue

    const chapterName = parts[1]
    let pageName = ''
    let isMainMd = false
    let isPageFile = false

    if (parts.length === 3) {
      // Doc/Chapter/Page.md
      pageName = parts[2]
      isMainMd = getFileType(pageName) === 'markdown'
      isPageFile = true
    } else if (parts.length >= 4) {
      // Doc/Chapter/PageFolder/README.md or example/...
      pageName = parts[2]
      const fileName = parts[parts.length - 1]
      isMainMd = fileName.toLowerCase() === 'readme.md' && parts.length === 4
      isPageFile = false
    }

    // Initialize chapter
    if (!chaptersMap.has(chapterName)) {
      chaptersMap.set(chapterName, {
        id: slugify(chapterName),
        title: titleFromFilename(chapterName, false),
        order: extractOrder(chapterName),
        pagesMap: new Map()
      })
    }

    const chapter = chaptersMap.get(chapterName)

    // Initialize page
    if (!chapter.pagesMap.has(pageName)) {
      chapter.pagesMap.set(pageName, {
        id: slugify(pageName),
        title: titleFromFilename(pageName, isPageFile),
        order: extractOrder(pageName),
        path: null,
        examples: [],
        attachments: []
      })
    }

    const page = chapter.pagesMap.get(pageName)

    // Categorize the file
    const fileName = parts[parts.length - 1]
    const fileType = getFileType(fileName)

    if (isMainMd) {
      page.path = filePath
    } else if (isExampleFolder(filePath)) {
      // Example file - group by example folder
      // parts: DocName/Chapter/Page/example/example-1/file.c
      if (parts.length >= 6) {
        const exampleName = parts[4]
        let example = page.examples.find(e => e.name === exampleName)
        if (!example) {
          example = { name: exampleName, files: [] }
          page.examples.push(example)
        }
        example.files.push({
          name: fileName,
          path: filePath,
          type: fileType
        })
      }
    } else if (fileType !== 'markdown' && fileType !== 'image') {
      // Attachment file (pdf, excel, code etc.) - excluding images
      page.attachments.push({
        name: fileName,
        path: filePath,
        type: fileType
      })
    }
  }

  // Convert maps to sorted arrays
  const chapters = Array.from(chaptersMap.values())
    .map(ch => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
      pages: Array.from(ch.pagesMap.values())
        .filter(p => p.path) // Only include pages with README.md
        .sort((a, b) => a.order - b.order)
    }))
    .filter(ch => ch.pages.length > 0)
    .sort((a, b) => a.order - b.order)

  return {
    id: docData.id,
    title: docData.title,
    layout: 'sidebar',
    chapters
  }
}

/**
 * Build dropdown doc structure
 * Structure: Doc > Category > Subcategory > Files
 */
function buildDropdownDoc(docData) {
  const categoriesMap = new Map()

  for (const filePath of docData.files) {
    const parts = filePath.split('/')
    // Expected: DocName/Category/Subcategory/file.ext
    if (parts.length < 4) continue

    const categoryName = parts[1]
    const subcategoryName = parts[2]
    const fileName = parts[parts.length - 1]

    // Initialize category
    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, {
        id: slugify(categoryName),
        title: categoryName,
        subcategoriesMap: new Map()
      })
    }

    const category = categoriesMap.get(categoryName)

    // Initialize subcategory
    if (!category.subcategoriesMap.has(subcategoryName)) {
      category.subcategoriesMap.set(subcategoryName, {
        id: slugify(subcategoryName),
        title: subcategoryName,
        files: []
      })
    }

    const subcategory = category.subcategoriesMap.get(subcategoryName)

    // Add file
    subcategory.files.push({
      name: fileName,
      path: filePath,
      type: getFileType(fileName)
    })
  }

  // Convert maps to arrays
  const categories = Array.from(categoriesMap.values())
    .map(cat => ({
      id: cat.id,
      title: cat.title,
      subcategories: Array.from(cat.subcategoriesMap.values())
    }))

  return {
    id: docData.id,
    title: docData.title,
    layout: 'dropdown',
    categories
  }
}

/**
 * Flatten pages for navigation
 */
function flatPages(docsTree) {
  const items = []

  for (const d of docsTree.docs) {
    if (d.layout === 'sidebar') {
      for (const ch of d.chapters || []) {
        for (const p of ch.pages || []) {
          items.push({
            sectionId: d.id,
            chapterId: ch.id,
            pageId: p.id,
            title: p.title,
            path: p.path,
            to: `/docs/${d.id}/${ch.id}/${p.id}`,
          })
        }
      }
    } else {
      for (const cat of d.categories || []) {
        for (const sub of cat.subcategories || []) {
          items.push({
            sectionId: d.id,
            categoryId: cat.id,
            subcategoryId: sub.id,
            title: sub.title,
            to: `/docs/${d.id}/${cat.id}/${sub.id}`,
          })
        }
      }
    }
  }

  return items
}
