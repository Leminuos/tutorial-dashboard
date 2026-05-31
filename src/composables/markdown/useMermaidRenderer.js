import mermaid from 'mermaid'

let currentThemeMode = null

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function initMermaid() {
  const isDark = document.documentElement.classList.contains('dark')
  const themeMode = isDark ? 'dark' : 'light'

  if (currentThemeMode === themeMode) return

  const canvasBg = getCssVar('--md-c-bg-soft', isDark ? '#242424' : '#f9f9f9')
  const mutedBg = getCssVar('--md-c-bg-mute', isDark ? '#2f2f2f' : '#f1f1f1')
  const textColor = getCssVar('--md-c-text-1', isDark ? 'rgba(255, 255, 255, .87)' : '#213547')
  const subtleTextColor = getCssVar('--md-c-text-2', isDark ? 'rgba(235, 235, 235, .6)' : 'rgba(60, 60, 60, .7)')
  const dividerColor = getCssVar('--md-c-divider-light', isDark ? 'rgba(84, 84, 84, .48)' : 'rgba(60, 60, 60, .12)')

  const themeVariables = isDark
    ? {
        background: canvasBg,
        mainBkg: mutedBg,
        primaryColor: mutedBg,
        primaryTextColor: textColor,
        primaryBorderColor: dividerColor,
        secondaryColor: '#2b3138',
        secondaryTextColor: textColor,
        secondaryBorderColor: '#4a5968',
        tertiaryColor: '#28332f',
        tertiaryTextColor: textColor,
        tertiaryBorderColor: '#49665c',
        textColor,
        nodeTextColor: textColor,
        lineColor: subtleTextColor,
        clusterBkg: canvasBg,
        clusterBorder: dividerColor,
        edgeLabelBackground: canvasBg,
        noteBkgColor: '#332f25',
        noteTextColor: textColor,
        noteBorderColor: '#6c603f',
        actorBkg: mutedBg,
        actorBorder: dividerColor,
        actorTextColor: textColor,
        signalColor: subtleTextColor,
        signalTextColor: textColor,
        labelTextColor: textColor,
        loopTextColor: textColor,
      }
    : {
        background: canvasBg,
        mainBkg: '#ffffff',
        primaryColor: '#ffffff',
        primaryTextColor: textColor,
        primaryBorderColor: dividerColor,
        secondaryColor: '#f2f6fb',
        secondaryTextColor: textColor,
        secondaryBorderColor: '#d6e0ec',
        tertiaryColor: '#f1f8f5',
        tertiaryTextColor: textColor,
        tertiaryBorderColor: '#d4e5dd',
        textColor,
        nodeTextColor: textColor,
        lineColor: subtleTextColor,
        clusterBkg: canvasBg,
        clusterBorder: dividerColor,
        edgeLabelBackground: canvasBg,
        noteBkgColor: '#fff8df',
        noteTextColor: textColor,
        noteBorderColor: '#ecd786',
        actorBkg: '#ffffff',
        actorBorder: dividerColor,
        actorTextColor: textColor,
        signalColor: subtleTextColor,
        signalTextColor: textColor,
        labelTextColor: textColor,
        loopTextColor: textColor,
      }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeVariables,
    themeCSS: `
      .node rect,
      .node polygon,
      .node circle,
      .node ellipse,
      .actor,
      .labelBox {
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, ${isDark ? '0.28' : '0.08'}));
      }

      .nodeLabel,
      .edgeLabel,
      .label,
      .messageText,
      .actor > text,
      .noteText {
        font-family: inherit;
        font-weight: 500;
      }
    `,
    flowchart: {
      htmlLabels: true,
      curve: 'monotoneX',
      padding: 15,
      nodeSpacing: 42,
      rankSpacing: 52
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10
    }
  })

  currentThemeMode = themeMode
}

async function renderDiagram(code, index) {
  const id = `mermaid-${Date.now()}-${index}`
  const { svg } = await mermaid.render(id, code)

  const diagramWrapper = document.createElement('div')
  diagramWrapper.className = 'mermaid-diagram'
  diagramWrapper.dataset.mermaidCode = code
  diagramWrapper.innerHTML = svg

  return diagramWrapper
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
        const diagramWrapper = await renderDiagram(code, i)

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
    // Match <pre ...><code class="language-mermaid">...</code></pre> pattern
    // The pre tag may have attributes like data-title from the custom fence renderer
    const mermaidRegex = /<pre[^>]*><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi

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
        const diagramWrapper = await renderDiagram(code, i)

        placeholder.replaceWith(diagramWrapper)

      } catch (err) {
        console.warn('Mermaid render error:', err)
        // Show error message
        placeholder.innerHTML = `<div class="mermaid-error">Mermaid diagram error: ${err.message}</div>`
        placeholder.className = 'mermaid-diagram mermaid-diagram-error'
      }
    }
  }

  async function rerenderMermaidDiagrams(container) {
    if (!container) return

    currentThemeMode = null
    initMermaid()

    const diagrams = container.querySelectorAll('.mermaid-diagram[data-mermaid-code]')

    for (let i = 0; i < diagrams.length; i++) {
      const diagram = diagrams[i]
      const code = diagram.dataset.mermaidCode || ''

      if (!code.trim()) continue

      try {
        const nextDiagram = await renderDiagram(code, i)
        diagram.replaceWith(nextDiagram)
      } catch (err) {
        console.warn('Mermaid render error:', err)
      }
    }
  }

  return {
    renderMermaidBlocks,
    markMermaidBlocks,
    renderMermaidPlaceholders,
    rerenderMermaidDiagrams
  }
}
