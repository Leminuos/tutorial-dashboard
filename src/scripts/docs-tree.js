import fs from 'node:fs'
import path from 'node:path'
import { slugify } from '../utils/slugify.js'

/**
 * Cấu hình:
 * - DOCS_ROOT: thư mục submodule chứa docs
 * - OUT_FILE: file output trong public để dev server/build serve được
 */
const DOCS_ROOT = path.resolve('public/docs')
const OUT_FILE  = path.resolve('public/docs/index.json')

function titleFromFilename(filename) {
  const base = filename.replace(/\.md$/i, '')
  const text = base.replace(/[-_]+/g, ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function buildDocsTree(mdFiles) {
  const sets = new Map()

  for (const md of mdFiles) {
    const parts = md.split('/')
    if (parts.length !== 4) continue

    const docName = parts[0]
    const chapterName = parts[1].replace(/^\d+\s*[\.\-_]\s*/, '')
    const fileName = parts[2].replace(/^\d+\s*[\.\-_]\s*/, '')

    const pageId = slugify(fileName)
    const pageTitle = titleFromFilename(fileName)

    if (!sets.has(docName)) sets.set(docName, new Map())
    const chapters = sets.get(docName)

    if (!chapters.has(chapterName)) chapters.set(chapterName, [])
    chapters.get(chapterName).push({
      id: pageId,
      title: pageTitle,
      path: md
    })
  }

  const docs = []
  for (const [setName, chaptersMap] of sets) {
    const chapters = []

    for (const [chapterName, pages] of chaptersMap) {
      chapters.push({
        id: slugify(chapterName),
        title: chapterName,
        pages
      })
    }

    docs.push({
      id: slugify(setName),
      title: setName,
      chapters
    })
  }

  return { docs }
}

function flatPages(docsTree) {
  const items = []

  for (const d of docsTree.docs || []) {
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


/*
 * Duyệt toàn bộ cây thư mục dir
 * Trả về danh sách đường dẫn tuyệt đối của tất cả file
 */
function walk(dir) {
  const out = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(abs))
    else out.push(abs)
  }
  return out
}

/*
 * Chuẩn hoá path cho website
 */
function toPosix(p) {
  return p.split(path.sep).join('/')
}

function main() {
  if (!fs.existsSync(DOCS_ROOT)) {
    throw new Error(`DOCS_ROOT not found: ${DOCS_ROOT}. Did you init submodules?`)
  }

  const allFiles = walk(DOCS_ROOT)
  const mdFiles = allFiles
    .filter(f => f.toLowerCase().endsWith('.md'))
    .map(abs => toPosix(path.relative(DOCS_ROOT, abs)))

  const tree = buildDocsTree(mdFiles)
  const flatLists = flatPages(tree)

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify({ tree, flatLists }, null, 2), 'utf8')

  console.log(`Generated ${OUT_FILE} from ${mdFiles.length} markdown files.`)
}

main()
