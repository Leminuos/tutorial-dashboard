/**
 * File types configuration for documentation viewer
 * Maps file extensions to renderer types
 */

export const FILE_TYPES = {
  markdown: ['.md'],
  pdf: ['.pdf'],
  excel: ['.xlsx', '.xls'],
  powerpoint: ['.pptx', '.ppt'],
  word: ['.doc', '.docx'],
  code: [
    '.c', '.h', '.cpp', '.hpp', '.cc',
    '.py', '.pyw',
    '.json',
    '.yaml', '.yml',
    '.sh', '.bash', '.zsh',
    '.html',
    '.kt', '.kts',
    '.ini', '.cfg',
    '.makefile', '.cmake',
    '.dts', '.dtsi',
  ],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'],
}

/**
 * Get file type from extension
 * @param {string} filename - File name or path
 * @returns {string} - File type (markdown, pdf, excel, powerpoint, code, image, unknown)
 */
export function getFileType(filename) {
  if (!filename) return 'unknown'

  const lowerName = filename.toLowerCase()

  // Check for special filenames without extension
  if (lowerName === 'makefile') {
    return 'code'
  }

  // Get extension
  const lastDot = lowerName.lastIndexOf('.')
  if (lastDot === -1) return 'unknown'

  const ext = lowerName.slice(lastDot)

  for (const [type, extensions] of Object.entries(FILE_TYPES)) {
    if (extensions.includes(ext)) {
      return type
    }
  }

  return 'unknown'
}

/**
 * Check if file should be shown in sidebar (markdown only)
 * @param {string} filename
 * @returns {boolean}
 */
export function isMarkdownFile(filename) {
  return getFileType(filename) === 'markdown'
}

/**
 * Check if path is an example folder
 * @param {string} path
 * @returns {boolean}
 */
export function isExampleFolder(path) {
  return path.toLowerCase().includes('/example/')
}

export default {
  FILE_TYPES,
  getFileType,
  isMarkdownFile,
  isExampleFolder,
}
