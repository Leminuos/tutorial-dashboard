import mermaid from 'mermaid'

// Initialize mermaid with default config
let initialized = false

function initMermaid() {
  if (initialized) return

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeVariables: {
      // Node styling - lavender/purple theme
      primaryColor: '#E8E0F0',
      primaryTextColor: '#333333',
      primaryBorderColor: '#9B8BB8',

      // Secondary colors
      secondaryColor: '#E8E0F0',
      secondaryTextColor: '#333333',
      secondaryBorderColor: '#9B8BB8',

      // Tertiary colors
      tertiaryColor: '#E8E0F0',
      tertiaryTextColor: '#333333',
      tertiaryBorderColor: '#9B8BB8',

      // Lines and arrows - purple for good visibility on both modes
      lineColor: '#9B8BB8',

      // Background
      background: '#ffffff',
      mainBkg: '#E8E0F0',

      // Text - purple for good contrast on both light and dark
      textColor: '#9B8BB8',

      // Nodes
      nodeBorder: '#9B8BB8',
      nodeTextColor: '#333333',

      // Flowchart specific
      clusterBkg: '#F5F0FA',
      clusterBorder: '#9B8BB8',

      // Sequence diagram specific - purple for visibility on both modes
      signalColor: '#9B8BB8',
      signalTextColor: '#9B8BB8',
      labelTextColor: '#9B8BB8',
      loopTextColor: '#9B8BB8',
      noteBkgColor: '#E8E0F0',
      noteTextColor: '#333333',
      noteBorderColor: '#9B8BB8',
      actorTextColor: '#333333',
      actorBkg: '#E8E0F0',
      actorBorder: '#9B8BB8',

      // Edge labels
      edgeLabelBackground: 'transparent',
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 50
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10
    }
  })

  initialized = true
}

/**
 * Composable for rendering Mermaid diagrams in markdown content
 */
export function useMermaidRenderer() {

  /**
   * Process HTML and render all mermaid code blocks
   * @param {HTMLElement} container - The container element with rendered markdown
   */
  async function renderMermaidBlocks(container) {
    if (!container) return

    initMermaid()

    // Find all code blocks with mermaid language
    const mermaidBlocks = container.querySelectorAll('pre code.language-mermaid, .code-block .language-mermaid')

    for (let i = 0; i < mermaidBlocks.length; i++) {
      const codeEl = mermaidBlocks[i]
      const preEl = codeEl.closest('pre')
      const wrapperEl = preEl?.closest('.code-block') || preEl

      if (!wrapperEl) continue

      const code = codeEl.textContent || ''

      if (!code.trim()) continue

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${i}`

        // Render the mermaid diagram
        const { svg } = await mermaid.render(id, code)

        // Create wrapper div for the diagram
        const diagramWrapper = document.createElement('div')
        diagramWrapper.className = 'mermaid-diagram'
        diagramWrapper.innerHTML = svg

        // Replace the code block with the rendered diagram
        wrapperEl.replaceWith(diagramWrapper)

      } catch (err) {
        console.warn('Mermaid render error:', err)
        // Keep the original code block on error
      }
    }
  }

  /**
   * Pre-process HTML to mark mermaid blocks before Shiki highlighting
   * This prevents Shiki from syntax highlighting mermaid code
   * @param {string} html - Raw HTML from markdown renderer
   * @returns {string} - HTML with mermaid blocks marked
   */
  function markMermaidBlocks(html) {
    // Match <pre><code class="language-mermaid">...</code></pre> pattern
    const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi

    return html.replace(mermaidRegex, (match, code) => {
      // Decode HTML entities
      const decodedCode = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')

      return `<div class="mermaid-placeholder" data-mermaid-code="${encodeURIComponent(decodedCode)}"></div>`
    })
  }

  /**
   * Render mermaid placeholders created by markMermaidBlocks
   * @param {HTMLElement} container - The container element
   */
  async function renderMermaidPlaceholders(container) {
    if (!container) return

    initMermaid()

    const placeholders = container.querySelectorAll('.mermaid-placeholder')

    for (let i = 0; i < placeholders.length; i++) {
      const placeholder = placeholders[i]
      const code = decodeURIComponent(placeholder.getAttribute('data-mermaid-code') || '')

      if (!code.trim()) continue

      try {
        const id = `mermaid-${Date.now()}-${i}`
        const { svg } = await mermaid.render(id, code)

        const diagramWrapper = document.createElement('div')
        diagramWrapper.className = 'mermaid-diagram'
        diagramWrapper.innerHTML = svg

        placeholder.replaceWith(diagramWrapper)

      } catch (err) {
        console.warn('Mermaid render error:', err)
        // Show error message
        placeholder.innerHTML = `<div class="mermaid-error">Mermaid diagram error: ${err.message}</div>`
        placeholder.className = 'mermaid-diagram mermaid-diagram-error'
      }
    }
  }

  return {
    renderMermaidBlocks,
    markMermaidBlocks,
    renderMermaidPlaceholders
  }
}
