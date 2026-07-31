import MarkdownIt from "markdown-it"
import anchor from "markdown-it-anchor"
import container from 'markdown-it-container'
import texmath from 'markdown-it-texmath'
import katex from 'katex'

/**
 * slugify: chuyển chuỗi văn bản thành chuối slug
 * slug là chuỗi:
 * + chỉ gồm chữ thường
 * + không ký tự đặc biệt
 * + dùng - để phân tách
 * Ví dụ: "Hello, World!" -> "hello-world"
 */
import { slugify } from "@/utils/slugify"

export function createMarkdownRenderer() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
  })

  // Math/LaTeX support: $inline$ and $$block$$
  md.use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: { throwOnError: false }
  })

  /**
   * Gắn anchor hay id cho các heading (h1-h6) khi render markdown sang html
   */
  md.use(anchor, {
    level: [2, 3, 4, 5], // chỉ gắn anchor cho các level này.
    slugify,             // chuyển text thàng slug
    permalink: anchor.permalink.linkInsideHeader({
      symbol: '#',
      placement: 'after',
      class: 'header-anchor',
      ariaHidden: true
    })
  })

  /**
   * Custom fence renderer to preserve filename from info string
   * Format: ```lang [filename]
   * Example: ```js [main.js]
   */
  const defaultFence = md.renderer.rules.fence
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = token.info ? token.info.trim() : ''

    // Parse info string: "lang [filename]" or just "lang"
    const match = info.match(/^(\S+?)(?:\s+\[(.+?)\])?$/)
    const lang = match ? match[1] : info
    const filename = match && match[2] ? match[2] : lang

    // Store original info for default renderer
    token.info = lang

    // Get default rendered HTML
    let result = defaultFence ? defaultFence(tokens, idx, options, env, self) : ''

    // Add data-title attribute with filename
    if (filename) {
      result = result.replace('<pre', `<pre data-title="${filename}"`)
    }

    return result
  }

  /**
   * Sử dụng custom container trong markdown bằng cú pháp dạng:
   * ::: <tên-container> [tiêu-đề-tuỳ-chọn]
   *  nội dung markdown bình thường
   * :::
   */
  md.use(container, 'tip', {
    render(tokens, idx) {
      const info = tokens[idx].info.trim().slice(3).trim() // Lấy title của container

      if (tokens[idx].nesting === 1) {
        // renderInline để title hỗ trợ inline markdown như `code`
        const title = md.renderInline(info || 'TIP')
        return `<div class="md-tip md-custom-block"><p class="md-custom-block-title">${title}</p>\n`
      }
      return `</div>\n`
    }
  })

  md.use(container, 'warning', {
    render(tokens, idx) {
      const info = tokens[idx].info.trim().slice(7).trim() // Lấy title của container

      if (tokens[idx].nesting === 1) {
        // renderInline để title hỗ trợ inline markdown như `code`
        const title = md.renderInline(info || 'WARNING')
        return `<div class="md-warning md-custom-block"><p class="md-custom-block-title">${title}</p>\n`
      }
      return `</div>\n`
    }
  })

  /**
   * Code Group container - groups multiple code blocks with tabs
   * Usage:
   * ::: code-group
   * ```js [main.js]
   * console.log('hello')
   * ```
   * ```ts [main.ts]
   * console.log('hello')
   * ```
   * :::
   */
  md.use(container, 'code-group', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        // Opening tag - we'll process the code blocks inside
        return `<div class="code-group">\n`
      }
      return `</div>\n`
    }
  })

  /**
   * Explain container - an explanation card attached to the code block above it.
   * Inside a code-group it is moved into the panel of that tab, so each tab
   * carries its own explanation; used on its own it renders as a plain card.
   *
   * Because it nests inside code-group, the group must open with 4 colons:
   * :::: code-group
   * ```c [main.c]
   * ...
   * ```
   * ::: explain [Giải thích main.c]
   * - `probe()`: ...
   * :::
   * ::::
   */
  md.use(container, 'explain', {
    render(tokens, idx) {
      const info = tokens[idx].info.trim().slice(7).trim() // Remove 'explain' prefix

      if (tokens[idx].nesting === 1) {
        // Title accepts [Title] or raw text, and supports inline markdown
        const match = info.match(/^\[(.+?)\]$/)
        const raw = match ? match[1] : info
        const title = md.renderInline(raw || 'Giải thích')
        return `<div class="code-explain"><p class="code-explain-title">${title}</p>\n`
      }
      return `</div>\n`
    }
  })

  /**
   * Content Group container - groups multiple content sections with tabs
   * Usage:
   * :::: content-group
   * ::: tab [Tab 1]
   * Markdown content here...
   * :::
   * ::: tab [Tab 2]
   * Other content...
   * :::
   * ::::
   */
  md.use(container, 'content-group', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        return `<div class="content-group">\n`
      }
      return `</div>\n`
    }
  })

  md.use(container, 'tab', {
    render(tokens, idx) {
      const info = tokens[idx].info.trim().slice(3).trim() // Remove 'tab' prefix

      if (tokens[idx].nesting === 1) {
        // Extract title from [Title] or use raw text
        const match = info.match(/^\[(.+?)\]$/)
        const title = match ? match[1] : info || 'Tab'
        return `<div class="content-tab" data-tab-title="${title}">\n`
      }
      return `</div>\n`
    }
  })

  /**
   * Lấy phần chữ thuần của heading để hiển thị trong mục lục.
   * Đi qua các inline token thay vì dùng markdown thô, nhờ vậy `code`,
   * **đậm**, [link](url)... không còn lộ ký tự cú pháp trong mục lục.
   * Link permalink (#) do markdown-it-anchor chèn thêm cũng được bỏ qua.
   */
  function headingText(inline) {
    if (!inline?.children?.length) return inline?.content ?? ""

    const parts = []
    let inPermalink = 0

    for (const token of inline.children) {
      if (
        token.type === "link_open" &&
        (token.attrGet("class") || "").includes("header-anchor")
      ) {
        inPermalink++
        continue
      }

      if (inPermalink) {
        if (token.type === "link_close") inPermalink--
        continue
      }

      switch (token.type) {
        case "text":
        case "code_inline":
        case "math_inline":
        case "image": // token.content là alt text
          parts.push(token.content)
          break
        case "softbreak":
        case "hardbreak":
          parts.push(" ")
          break
      }
    }

    return parts.join("").replace(/\s+/g, " ").trim()
  }

  /**
   * Thêm đoạn hook khi render heading để thu thập Table of Content.
   */
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const level = Number(token.tag.slice(1))

    if (level >= 2 && level <= 5) {

      /**
       * Text của tiêu đề nằm trong token kế tiếp
       * thường là token inline
       */
      const inline = tokens[idx + 1]
      const text = inline && inline.type === "inline" ? headingText(inline) : ""

      /**
       * Lấy id dùng để link tới heading tag
       */
      const id = token.attrGet("id") || slugify(text)

      if (!env.toc) env.toc = []
      env.toc.push({ level, text, id })
    }

    return self.renderToken(tokens, idx, options)
  }

  /**
   * Thêm đoạn hook khi render img, chuyển đường dẫn relative thành absolute
   */
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const src = token.attrGet("src")

    if (src && env?.baseUrl) {
      const isAbsolute =
        /^https?:\/\//i.test(src) || src.startsWith("/") || src.startsWith("data:")

      if (!isAbsolute) {
        const resolved = new URL(src, env.baseUrl).href
        token.attrSet("src", resolved)
      }
    }

    return self.renderToken(tokens, idx, options)
  };

  function render(md_text, md_url) {

    const env = { toc: [], baseUrl: new URL("./", md_url).href }
    const html = md.render(md_text, env)

    return { html, toc: env.toc || [] }
  }

  return { render }
}
