import { defineStore } from 'pinia'
import config from '@/config/github.config.js'
import { getFileType } from '@/config/fileTypes.config.js'
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
        this.tree = await buildDocsTree(allPaths, this.docConfig)

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
  const text = withoutOrder.replace(/_+/g, " ").replace(/\s+/g, " ").trim()
  return text
    ? text.replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
    : base
}

function extractOrder(filename) {
  const match = filename.match(/^(\d+)\s*[.\-_]/)
  return match ? parseInt(match[1], 10) : 999
}

export function buildRawUrl(path) {
  const encodedPath = path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encodedPath}`
}

async function buildDocsTree(allPaths, docConfig) {
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

  // Tutorial sections read their navigation from index.json files, so they are
  // resolved asynchronously; folder/posts sections are still derived from paths.
  const docs = await Promise.all(
    Array.from(docsMap.values()).map(docData => {
      switch (docData.layout) {
        case 'folder':
          return buildTreeDoc(docData, 'folder')
        case 'posts':
          return buildTreeDoc(docData, 'posts')
        default:
          return buildTutorialDoc(docData)
      }
    })
  )

  return { docs }
}

// ============ Tutorial layout (index.json driven) ============

const INDEX_FILE = 'index.json'

function baseName(path) {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] || path
}

function dirName(path) {
  const segments = path.split('/').filter(Boolean)
  segments.pop()
  return segments.join('/')
}

async function fetchIndexFile(path) {
  const res = await fetch(buildRawUrl(path), { headers: createGithubHeader() })
  if (!res.ok) throw new Error(`Cannot read "${path}" (HTTP ${res.status})`)
  try {
    return await res.json()
  } catch {
    throw new Error(`"${path}" is not valid JSON`)
  }
}

/**
 * Normalize a toctree into entry objects.
 * An entry is either a path string or an object with at least a `path`.
 */
function normalizeToctree(index, indexPath) {
  const toctree = index?.toctree
  if (!Array.isArray(toctree)) {
    console.warn(`"${indexPath}" has no "toctree" array`)
    return []
  }

  return toctree
    .map(entry => (typeof entry === 'string' ? { path: entry } : entry))
    .filter(entry => {
      const valid = entry && typeof entry.path === 'string' && entry.path.trim()
      if (!valid) console.warn(`Skipping invalid toctree entry in "${indexPath}"`)
      return valid
    })
}

/**
 * Build tutorial doc structure from the section index.json and one index.json
 * per chapter. Navigation is declared, never inferred from repository paths.
 */
async function buildTutorialDoc(docData) {
  const section = {
    id: docData.id,
    title: docData.title,
    layout: 'tutorial',
    rawName: docData.rawName,
    chapters: [],
    error: null
  }

  const indexPath = `${docData.rawName}/${INDEX_FILE}`
  let index
  try {
    index = await fetchIndexFile(indexPath)
  } catch (err) {
    section.error = err.message
    console.error(`Tutorial section "${docData.rawName}" has no usable index:`, err.message)
    return section
  }

  if (index.title) section.title = index.title
  if (index.description) section.description = index.description

  const chapters = await Promise.all(
    normalizeToctree(index, indexPath).map(entry => buildTutorialChapter(docData, entry))
  )
  section.chapters = chapters.filter(Boolean)

  return section
}

async function buildTutorialChapter(docData, entry) {
  const chapterDir = `${docData.rawName}/${entry.path}`
  const indexPath = `${chapterDir}/${INDEX_FILE}`

  let index
  try {
    index = await fetchIndexFile(indexPath)
  } catch (err) {
    console.error(`Skipping chapter "${chapterDir}":`, err.message)
    return null
  }

  const name = baseName(entry.path)
  const pages = normalizeToctree(index, indexPath)
    .map(pageEntry => buildTutorialPage(docData, chapterDir, pageEntry))
    .filter(Boolean)

  if (!pages.length) {
    console.warn(`Chapter "${chapterDir}" declares no page, skipping`)
    return null
  }

  return {
    id: entry.id || slugify(name),
    title: entry.title || index.title || titleFromFilename(name),
    pages
  }
}

function buildTutorialPage(docData, chapterDir, entry) {
  const isMarkdownEntry = getFileType(baseName(entry.path)) === 'markdown'
  const pagePath = isMarkdownEntry
    ? `${chapterDir}/${entry.path}`
    : `${chapterDir}/${entry.path}/README.md`

  if (!docData.files.includes(pagePath)) {
    console.warn(`Page "${pagePath}" declared in the toctree does not exist`)
    return null
  }

  const name = baseName(entry.path)
  const pageDir = dirName(pagePath)

  return {
    id: entry.id || slugify(isMarkdownEntry ? name.replace(/\.md$/i, '') : name),
    title: entry.title || titleFromFilename(name, isMarkdownEntry),
    path: pagePath,
    // A markdown entry shares its folder with sibling pages, so its assets must
    // be declared explicitly instead of being collected from that folder.
    ...collectPageAssets(docData.files, pageDir, pagePath, entry, !isMarkdownEntry)
  }
}

function toFileEntry(path) {
  const name = baseName(path)
  return { name, path, type: getFileType(name) }
}

/**
 * Resolve the examples and attachments of a page.
 * Declared `examples`/`attachments` win; otherwise they are collected from the
 * page folder (`example/*` folders become examples, leftover files attachments).
 */
function collectPageAssets(sectionFiles, pageDir, pagePath, entry, autoCollect) {
  const claimed = new Set([pagePath])
  const examples = []

  const collectExample = (name, dir) => {
    const files = sectionFiles.filter(p => p.startsWith(`${dir}/`))
    files.forEach(p => claimed.add(p))
    if (files.length) examples.push({ name, files: files.map(toFileEntry) })
  }

  if (Array.isArray(entry.examples)) {
    for (const raw of entry.examples) {
      const example = typeof raw === 'string' ? { path: raw } : raw
      if (!example?.path) continue
      collectExample(example.name || baseName(example.path), `${pageDir}/${example.path}`)
    }
  } else if (autoCollect) {
    const exampleRoot = `${pageDir}/example/`
    const grouped = new Map()

    for (const path of sectionFiles) {
      if (!path.startsWith(exampleRoot)) continue
      const rest = path.slice(exampleRoot.length).split('/')
      // Files sitting directly in example/ form a single unnamed group
      const groupName = rest.length > 1 ? rest[0] : 'example'
      if (!grouped.has(groupName)) grouped.set(groupName, [])
      grouped.get(groupName).push(path)
      claimed.add(path)
    }

    for (const [name, files] of grouped) {
      examples.push({ name, files: files.map(toFileEntry) })
    }
  }

  let attachments
  if (Array.isArray(entry.attachments)) {
    attachments = entry.attachments.map(rel => toFileEntry(`${pageDir}/${rel}`))
  } else if (autoCollect) {
    attachments = sectionFiles
      .filter(path => {
        if (!path.startsWith(`${pageDir}/`)) return false
        if (claimed.has(path)) return false
        if (path.slice(pageDir.length + 1).split('/').some(p => p.toLowerCase() === 'img')) return false
        const type = getFileType(baseName(path))
        return type !== 'markdown' && type !== 'image'
      })
      .map(toFileEntry)
  } else {
    attachments = []
  }

  return { examples, attachments }
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
