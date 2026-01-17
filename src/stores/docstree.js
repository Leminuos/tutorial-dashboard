import { defineStore } from 'pinia'
import config from '@/config/github.config.js'
import { getFileType, isExampleFolder } from '@/config/fileTypes.config.js'
import { slugify } from '@/utils/slugify'

const OWNER = config.github.owner || "YOUR_OWNER"
const REPO = config.github.repo || "YOUR_REPO"
const BRANCH = config.github.branch || "master"
const TOKEN = config.github.token || ""

// Cache for raw paths (slug -> raw name mapping)
const rawPathCache = new Map()

export const useDocsStore = defineStore('docs', {

  state: () => ({
    tree: null,
    flatLists: null,
    docConfig: null,
    postsMetadata: {},
    loading: false,
    error: null,
  }),

  getters: {
    tutorialDocs: (state) => state.tree?.docs?.filter(d => d.layout === 'tutorial') || [],
    folderDocs: (state) => state.tree?.docs?.filter(d => d.layout === 'folder') || [],
    postDocs: (state) => state.tree?.docs?.filter(d => d.layout === 'posts') || [],
    getPostMetadata: (state) => (categoryId) => state.postsMetadata[categoryId] || null,
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

        // 2) Fetch tree recursive
        const treeJson = await fetchGithubToJson(
          `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${sha}?recursive=1`
        )

        const allPaths = (treeJson.tree || [])
          .filter(x => x.type === "blob" && typeof x.path === "string")
          .map(x => x.path)

        // 3) Fetch .docconfig.json
        this.docConfig = await fetchDocConfig()

        // 4) Build docs tree
        this.tree = buildDocsTree(allPaths, this.docConfig)

        // 5) Flat lists
        this.flatLists = flatPages(this.tree)

      } catch (err) {
        this.error = err.message
        console.error('Failed to load docs:', err)
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch posts.json for a specific category folder
     * Optimized with rawPath caching
     */
    async fetchCategoryMetadata(categoryId) {
      if (this.postsMetadata[categoryId]) return

      try {
        // Use cached rawPath if available
        let rawPath = rawPathCache.get(categoryId)

        if (!rawPath) {
          rawPath = this.resolveRawPath(categoryId)
          if (rawPath) rawPathCache.set(categoryId, rawPath)
        }

        if (!rawPath) {
          this.postsMetadata[categoryId] = { posts: [] }
          return
        }

        const url = buildRawUrl(`${rawPath}/posts.json`)
        const res = await fetch(url)

        if (!res.ok) {
          this.postsMetadata[categoryId] = { posts: [] }
          return
        }

        const json = await res.json()
        let posts = []
        let meta = {}

        if (Array.isArray(json.posts)) {
          posts = json.posts
          meta = { ...json }
          delete meta.posts
        } else {
          // Dictionary format
          for (const [key, val] of Object.entries(json)) {
            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
              posts.push({ id: slugify(key), originalKey: key, ...val })
            } else {
              meta[key] = val
            }
          }
        }

        this.postsMetadata[categoryId] = { ...meta, rawPath, posts }

      } catch (err) {
        console.warn(`Failed to fetch metadata for ${categoryId}:`, err)
        this.postsMetadata[categoryId] = { posts: [] }
      }
    },

    /**
     * Resolve raw GitHub path from slug-based categoryId
     */
    resolveRawPath(categoryId) {
      const parts = categoryId.split('/')
      const sectionId = parts[0]
      const folderPath = parts.slice(1)

      const doc = this.tree?.docs?.find(d => d.id === sectionId)
      if (!doc) return null

      const rawPathParts = [doc.rawName || doc.title]

      let current = doc
      for (const segment of folderPath) {
        if (!current.children) break
        const child = current.children.find(c => c.id === segment)
        if (child) {
          rawPathParts.push(child.name)
          current = child
        } else {
          rawPathParts.push(segment)
        }
      }

      return rawPathParts.join('/')
    },

    getDocById(sectionId) {
      return this.tree?.docs?.find(d => d.id === sectionId) || null
    },

    getTutorialPage(sectionId, chapterId, pageId) {
      const doc = this.getDocById(sectionId)
      if (!doc || doc.layout !== 'tutorial') return null
      const chapter = doc.chapters?.find(c => c.id === chapterId)
      return chapter?.pages?.find(p => p.id === pageId) || null
    },

    getFolderNode(sectionId, pathSegments = []) {
      const doc = this.getDocById(sectionId)
      if (!doc || (doc.layout !== 'folder' && doc.layout !== 'posts')) return null

      let current = doc
      for (const segment of pathSegments) {
        if (!current.children) return null
        const child = current.children.find(c => c.id === segment)
        if (!child) return null
        current = child
      }
      return current
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

async function fetchDocConfig() {
  try {
    const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/.docconfig.json`
    const res = await fetch(url, { headers: createGithubHeader() })
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

function titleFromFilename(filename, isFile = false) {
  let base = isFile ? filename.replace(/\.[a-z0-9]{2,4}$/i, "") : filename
  const withoutOrder = base.replace(/^\d+[.\s\-_]*/, "")
  const text = withoutOrder.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : base
}

function extractOrder(filename) {
  const match = filename.match(/^(\d+)\s*[.\-_]/)
  return match ? parseInt(match[1], 10) : 999
}

export function buildRawUrl(path) {
  const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encodedPath}`
}

function buildDocsTree(allPaths, docConfig) {
  const docsMap = new Map()

  for (const path of allPaths) {
    const parts = path.split('/')
    if (parts.length < 2 || parts[0].startsWith('.')) continue

    const docName = parts[0]
    const layout = docConfig[docName]?.layout || 'tutorial'

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
  for (const docData of docsMap.values()) {
    switch (docData.layout) {
      case 'tutorial':
        docs.push(buildTutorialDoc(docData))
        break
      case 'folder':
        docs.push(buildTreeDoc(docData, 'folder'))
        break
      case 'posts':
        docs.push(buildTreeDoc(docData, 'posts'))
        break
    }
  }

  return { docs }
}

/**
 * Build tutorial doc structure (optimized)
 */
function buildTutorialDoc(docData) {
  const chaptersMap = new Map()

  for (const filePath of docData.files) {
    const parts = filePath.split('/')

    // Skip img folders and short paths
    if (parts.length < 3 || parts.some(p => p.toLowerCase() === 'img')) continue

    const chapterName = parts[1]
    const pageName = parts[2]
    const fileName = parts[parts.length - 1]
    const isMainMd = parts.length === 3
      ? getFileType(pageName) === 'markdown'
      : (fileName.toLowerCase() === 'readme.md' && parts.length === 4)

    // Get or create chapter
    let chapter = chaptersMap.get(chapterName)
    if (!chapter) {
      chapter = {
        id: slugify(chapterName),
        title: titleFromFilename(chapterName),
        order: extractOrder(chapterName),
        pagesMap: new Map()
      }
      chaptersMap.set(chapterName, chapter)
    }

    // Get or create page
    let page = chapter.pagesMap.get(pageName)
    if (!page) {
      page = {
        id: slugify(pageName),
        title: titleFromFilename(pageName, parts.length === 3),
        order: extractOrder(pageName),
        path: null,
        examples: [],
        attachments: []
      }
      chapter.pagesMap.set(pageName, page)
    }

    // Categorize file
    const fileType = getFileType(fileName)
    if (isMainMd) {
      page.path = filePath
    } else if (isExampleFolder(filePath) && parts.length >= 6) {
      const exampleName = parts[4]
      let example = page.examples.find(e => e.name === exampleName)
      if (!example) {
        example = { name: exampleName, files: [] }
        page.examples.push(example)
      }
      example.files.push({ name: fileName, path: filePath, type: fileType })
    } else if (fileType !== 'markdown' && fileType !== 'image') {
      page.attachments.push({ name: fileName, path: filePath, type: fileType })
    }
  }

  // Convert to sorted arrays
  const chapters = Array.from(chaptersMap.values())
    .map(ch => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
      pages: Array.from(ch.pagesMap.values())
        .filter(p => p.path)
        .sort((a, b) => a.order - b.order)
    }))
    .filter(ch => ch.pages.length > 0)
    .sort((a, b) => a.order - b.order)

  return {
    id: docData.id,
    title: docData.title,
    layout: 'tutorial',
    chapters
  }
}

/**
 * Build tree doc structure (unified for folder and posts layouts)
 * Uses Map for O(1) folder lookups instead of O(n) find()
 */
function buildTreeDoc(docData, layout) {
  const root = {
    id: docData.id,
    title: docData.title,
    layout,
    rawName: docData.rawName,
    children: []
  }

  // Use Map for fast folder lookup: Map<parentPath, Map<folderName, folderNode>>
  const folderCache = new Map()
  folderCache.set('', new Map()) // Root level

  const skipImg = layout === 'posts'

  for (const filePath of docData.files) {
    const parts = filePath.split('/')
    if (parts.length < 2) continue

    // For posts: skip img folders and image files
    if (skipImg) {
      if (parts.slice(1, -1).some(p => p.toLowerCase() === 'img')) continue
      const fileType = getFileType(parts[parts.length - 1])
      if (fileType === 'image') continue
    }

    const fileName = parts[parts.length - 1]
    const fileType = getFileType(fileName)

    // Navigate/create folder structure using cache
    let current = root
    let currentPath = ''

    for (let i = 1; i < parts.length - 1; i++) {
      const folderName = parts[i]

      // Skip img folders for posts layout
      if (skipImg && folderName.toLowerCase() === 'img') continue

      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

      // Check cache first
      let levelCache = folderCache.get(parentPath)
      if (!levelCache) {
        levelCache = new Map()
        folderCache.set(parentPath, levelCache)
      }

      let folder = levelCache.get(folderName)
      if (!folder) {
        folder = {
          id: slugify(folderName),
          name: folderName,
          title: titleFromFilename(folderName),
          type: 'folder',
          order: extractOrder(folderName),
          children: []
        }
        levelCache.set(folderName, folder)
        current.children.push(folder)

        // Initialize cache for this folder's children
        folderCache.set(currentPath, new Map())
      }
      current = folder
    }

    // Add file
    current.children.push({
      id: slugify(fileName),
      name: fileName,
      title: titleFromFilename(fileName, true),
      type: 'file',
      fileType,
      path: filePath,
      order: extractOrder(fileName)
    })
  }

  // Sort children recursively
  sortChildrenRecursive(root)

  return root
}

function sortChildrenRecursive(node) {
  if (!node.children?.length) return

  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.order - b.order
  })

  for (const child of node.children) {
    if (child.type === 'folder') sortChildrenRecursive(child)
  }
}

function flatPages(docsTree) {
  const items = []

  for (const d of docsTree.docs) {
    if (d.layout === 'tutorial') {
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
      collectFilesFlat(d, [], items, d.id)
    }
  }

  return items
}

function collectFilesFlat(node, pathParts, items, sectionId) {
  if (!node.children) return
  for (const child of node.children) {
    const childPath = [...pathParts, child.id]
    if (child.type === 'folder') {
      collectFilesFlat(child, childPath, items, sectionId)
    } else {
      items.push({
        sectionId,
        folderId: pathParts.join('/'),
        fileId: child.id,
        title: child.title || child.name,
        path: child.path,
        to: `/${sectionId}/${pathParts.join('/')}`,
      })
    }
  }
}
