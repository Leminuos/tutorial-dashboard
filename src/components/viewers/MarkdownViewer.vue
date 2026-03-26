<script setup>
import '@/assets/css/markdown.css'
import { ref, watch, watchEffect, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { createMarkdownRenderer } from '@/service/markdown/createMarkdownRenderer'
import { useShikiHighlighter } from '@/service/shiki/useShikiHighlighter'
import { useScrollSpy } from '@/composables/markdown/useScrollSpy'
import { useMermaidRenderer } from '@/composables/markdown/useMermaidRenderer'

const props = defineProps({
  src: { type: String, required: true },
  maxWidth: { type: String, default: '688px' },
})

const emit = defineEmits(['toc-update', 'toc-active'])

const html = ref('Loading...')
const tocItems = ref([])

const contentEl = ref(null) // gắn vào element chứa v-html

// Image lightbox state
const lightboxImage = ref(null)

// Mermaid lightbox state
const lightboxMermaid = ref(null)
const mermaidScale = ref(1)
const mermaidTranslate = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const translateStart = ref({ x: 0, y: 0 })

// Pinch-to-zoom state
const activePointers = ref(new Map()) // pointerId -> {x,y}
const lastPinchDist = ref(0)
const lastPinchScale = ref(1)

const { render } = createMarkdownRenderer()
const { highlightMarkdownHtml } = useShikiHighlighter()
const { activeId, setup: setupScrollSpy } = useScrollSpy(contentEl)
const { markMermaidBlocks, renderMermaidPlaceholders } = useMermaidRenderer()

function wrapShikiBlock(shikiHtml, lang, dataTitle) {
  const safeLang = (lang || 'text').toLowerCase()
  const titleAttr = dataTitle ? ` data-title="${dataTitle}"` : ''

  return `
    <div class="code-block"${titleAttr}>
      <span class="code-lang">${safeLang}</span>
      <button class="code-copy" type="button" aria-label="Copy code">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"/>
        </svg>
      </button>
      ${shikiHtml}
    </div>
  `
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

function onContentClick(e) {
  // Handle anchor links - scroll to heading instead of navigating
  const anchor = e.target.closest('a[href^="#"]')
  if (anchor) {
    e.preventDefault()
    const targetId = anchor.getAttribute('href').slice(1)

    // Try exact ID match first
    let targetEl = document.getElementById(targetId)

    // Fallback: search headings by comparing slugified text
    if (!targetEl && contentEl.value) {
      const headings = contentEl.value.querySelectorAll('h1, h2, h3, h4, h5, h6')

      // Normalize the anchor for comparison (remove diacritics, lowercase)
      const normalizeText = (str) =>
        str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'd')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

      // Fuzzy: strip all non-alphanumeric for looser matching
      const fuzzy = (str) => normalizeText(str).replace(/-/g, '')

      const normalizedAnchor = normalizeText(decodeURIComponent(targetId))
      const fuzzyAnchor = fuzzy(decodeURIComponent(targetId))

      for (const heading of headings) {
        const headingId = heading.getAttribute('id') || ''
        const headingText = heading.textContent || ''
        const normalizedText = normalizeText(headingText)
        const fuzzyText = fuzzy(headingText)

        // Check: exact ID, normalized match, fuzzy match, or contains
        if (
          headingId === targetId ||
          normalizedText === normalizedAnchor ||
          fuzzyText === fuzzyAnchor ||
          fuzzyText.includes(fuzzyAnchor) ||
          fuzzyAnchor.includes(fuzzyText)
        ) {
          targetEl = heading
          break
        }
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Preserve hash-based route and append anchor
      // Strip any existing /#anchor from the hash first
      const routeHash = window.location.hash.replace(/\/#[^/]*$/, '')
      const anchorHash = '#' + (targetEl.id || targetId)
      history.replaceState(null, '', routeHash + '/' + anchorHash)
    }
    return
  }

  // Handle code copy button
  const btn = e.target.closest('.code-copy')
  if (btn) {
    const block = btn.closest('.code-block')
    const pre = block?.querySelector('pre')
    const code = pre?.textContent || ''

    copyToClipboard(code).then((ok) => {
      if (!ok) return

      btn.classList.add('copied')
      setTimeout(() => {
        btn.classList.remove('copied')
      }, 1200)
    })
    return
  }

  // Handle mermaid diagram click for lightbox
  const mermaidDiagram = e.target.closest('.mermaid-diagram')
  if (mermaidDiagram && !mermaidDiagram.classList.contains('mermaid-diagram-error')) {
    const svg = mermaidDiagram.querySelector('svg')
    if (svg) {
      lightboxMermaid.value = svg.outerHTML
      mermaidScale.value = 1
      mermaidTranslate.value = { x: 0, y: 0 }
    }
    return
  }

  // Handle image click for lightbox
  const img = e.target.closest('img')
  if (img && !img.closest('.mermaid-diagram')) {
    lightboxImage.value = img.src
  }
}

function closeLightbox() {
  lightboxImage.value = null
}

function closeMermaidLightbox() {
  lightboxMermaid.value = null
  isDragging.value = false
  activePointers.value.clear()
}

function clampScale(s) {
  return Math.min(Math.max(0.3, s), 5)
}

function onMermaidWheel(e) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  mermaidScale.value = clampScale(mermaidScale.value + delta)
}

function zoomIn() {
  mermaidScale.value = clampScale(mermaidScale.value + 0.3)
}

function zoomOut() {
  mermaidScale.value = clampScale(mermaidScale.value - 0.3)
}

function resetZoom() {
  mermaidScale.value = 1
  mermaidTranslate.value = { x: 0, y: 0 }
}

function getPinchDist(pointers) {
  const pts = Array.from(pointers.values())
  if (pts.length < 2) return 0
  const dx = pts[0].x - pts[1].x
  const dy = pts[0].y - pts[1].y
  return Math.sqrt(dx * dx + dy * dy)
}

function onMermaidPointerDown(e) {
  activePointers.value.set(e.pointerId, { x: e.clientX, y: e.clientY })
  e.currentTarget.setPointerCapture(e.pointerId)

  if (activePointers.value.size === 1) {
    // Single finger / mouse → start drag
    isDragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    translateStart.value = { ...mermaidTranslate.value }
  } else if (activePointers.value.size === 2) {
    // Two fingers → start pinch
    isDragging.value = false
    lastPinchDist.value = getPinchDist(activePointers.value)
    lastPinchScale.value = mermaidScale.value
  }
}

function onMermaidPointerMove(e) {
  activePointers.value.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (activePointers.value.size === 2) {
    // Pinch zoom
    const dist = getPinchDist(activePointers.value)
    if (lastPinchDist.value > 0) {
      const ratio = dist / lastPinchDist.value
      mermaidScale.value = clampScale(lastPinchScale.value * ratio)
    }
    return
  }

  if (!isDragging.value || activePointers.value.size !== 1) return
  mermaidTranslate.value = {
    x: translateStart.value.x + (e.clientX - dragStart.value.x),
    y: translateStart.value.y + (e.clientY - dragStart.value.y),
  }
}

function onMermaidPointerUp(e) {
  activePointers.value.delete(e.pointerId)
  if (activePointers.value.size < 2) {
    lastPinchDist.value = 0
  }
  if (activePointers.value.size === 0) {
    isDragging.value = false
  }
}

// Setup code groups with tabs after render
function setupCodeGroups() {
  const groups = contentEl.value?.querySelectorAll('.code-group')
  if (!groups) return

  groups.forEach((group) => {
    const codeBlocks = group.querySelectorAll('.code-block')
    if (codeBlocks.length === 0) return

    // Create tabs container
    const tabsContainer = document.createElement('div')
    tabsContainer.className = 'code-group-tabs'

    // Create panels container
    const panelsContainer = document.createElement('div')
    panelsContainer.className = 'code-group-panels'

    codeBlocks.forEach((block, index) => {
      // Extract file name from data-title attribute on code-block div
      const filename = block.dataset?.title || 'code'

      // Create tab button
      const tab = document.createElement('button')
      tab.className = `code-group-tab${index === 0 ? ' active' : ''}`
      tab.innerHTML = filename
      tab.dataset.index = index

      // Create panel
      const panel = document.createElement('div')
      panel.className = `code-group-panel${index === 0 ? ' active' : ''}`
      panel.appendChild(block.cloneNode(true))

      // Tab click handler
      tab.addEventListener('click', () => {
        // Update tabs
        tabsContainer
          .querySelectorAll('.code-group-tab')
          .forEach((t) => t.classList.remove('active'))
        tab.classList.add('active')

        // Update panels
        panelsContainer
          .querySelectorAll('.code-group-panel')
          .forEach((p) => p.classList.remove('active'))
        panelsContainer.children[index].classList.add('active')
      })

      tabsContainer.appendChild(tab)
      panelsContainer.appendChild(panel)
    })

    // Clear original content and add new structure
    group.innerHTML = ''
    group.appendChild(tabsContainer)
    group.appendChild(panelsContainer)
  })
}

// Setup content groups with tabs after render
function setupContentGroups() {
  const groups = contentEl.value?.querySelectorAll('.content-group')
  if (!groups) return

  groups.forEach((group) => {
    const tabs = group.querySelectorAll(':scope > .content-tab')
    if (tabs.length === 0) return

    // Create tabs container
    const tabsContainer = document.createElement('div')
    tabsContainer.className = 'content-group-tabs'

    // Create panels container
    const panelsContainer = document.createElement('div')
    panelsContainer.className = 'content-group-panels'

    tabs.forEach((tab, index) => {
      const title = tab.dataset.tabTitle || `Tab ${index + 1}`

      // Create tab button
      const tabBtn = document.createElement('button')
      tabBtn.className = `content-group-tab${index === 0 ? ' active' : ''}`
      tabBtn.textContent = title
      tabBtn.dataset.index = index

      // Create panel
      const panel = document.createElement('div')
      panel.className = `content-group-panel${index === 0 ? ' active' : ''}`
      // Move original content into panel
      panel.appendChild(tab.cloneNode(true))

      // Tab click handler
      tabBtn.addEventListener('click', () => {
        tabsContainer
          .querySelectorAll('.content-group-tab')
          .forEach((t) => t.classList.remove('active'))
        tabBtn.classList.add('active')

        panelsContainer
          .querySelectorAll('.content-group-panel')
          .forEach((p) => p.classList.remove('active'))
        panelsContainer.children[index].classList.add('active')
      })

      tabsContainer.appendChild(tabBtn)
      panelsContainer.appendChild(panel)
    })

    // Clear original content and add new structure
    group.innerHTML = ''
    group.appendChild(tabsContainer)
    group.appendChild(panelsContainer)
  })
}

// Scroll to anchor from URL on page load (e.g. #/route/path/#heading-id)
function scrollToAnchorFromUrl() {
  const hash = window.location.hash // e.g. "#/posts/view/.../i2c/#i2c-master"
  const anchorMatch = hash.match(/#([^/]+)$/) // match last #anchor
  if (!anchorMatch || anchorMatch[1].startsWith('/')) return

  const targetId = decodeURIComponent(anchorMatch[1])
  let targetEl = document.getElementById(targetId)

  // Fallback: search headings by normalized text
  if (!targetEl && contentEl.value) {
    const headings = contentEl.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const normalizeText = (str) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

    const fuzzy = (str) => normalizeText(str).replace(/-/g, '')
    const normalizedAnchor = normalizeText(targetId)
    const fuzzyAnchor = fuzzy(targetId)

    for (const heading of headings) {
      const headingId = heading.getAttribute('id') || ''
      const headingText = heading.textContent || ''
      const normalizedText = normalizeText(headingText)
      const fuzzyText = fuzzy(headingText)

      if (
        headingId === targetId ||
        normalizedText === normalizedAnchor ||
        fuzzyText === fuzzyAnchor ||
        fuzzyText.includes(fuzzyAnchor) ||
        fuzzyAnchor.includes(fuzzyText)
      ) {
        targetEl = heading
        break
      }
    }
  }

  if (targetEl) {
    // Small delay to ensure layout is complete
    setTimeout(() => {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (lightboxMermaid.value) closeMermaidLightbox()
    else if (lightboxImage.value) closeLightbox()
  }
}

watch(
  activeId,
  (id) => {
    emit('toc-active', id)
  },
  { immediate: true },
)

watchEffect(async () => {
  try {
    const res = await fetch(props.src)
    const md_text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${md_text}`)

    const md_url = res.url
    const { html: rawHtml, toc } = render(md_text, md_url)

    // Mark mermaid blocks before Shiki highlighting
    const markedHtml = markMermaidBlocks(rawHtml)

    // Highlight code with Shiki
    html.value = await highlightMarkdownHtml(markedHtml, {
      theme: 'one-dark-pro',
      wrap: wrapShikiBlock,
    })

    tocItems.value = toc
    emit('toc-update', toc)
  } catch (err) {
    console.error('Fetch failed:', err)

    html.value = 'Loading...'
    tocItems.value = []
  }

  await nextTick()

  // Render mermaid diagrams after HTML is mounted
  await renderMermaidPlaceholders(contentEl.value)

  // Setup code groups with tabs
  setupCodeGroups()

  // Setup content groups with tabs
  setupContentGroups()

  setupScrollSpy()

  // Scroll to anchor if URL contains one (e.g. #/route/path/#heading-id)
  scrollToAnchorFromUrl()
})

onMounted(async () => {
  contentEl.value?.addEventListener('click', onContentClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  contentEl.value?.removeEventListener('click', onContentClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <article
    ref="contentEl"
    class="md-content"
    :style="{ '--md-content-max-width': props.maxWidth }"
    v-html="html"
  ></article>

  <!-- Image Lightbox -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div v-if="lightboxImage" class="lightbox-overlay" @click="closeLightbox">
        <button class="lightbox-close" @click="closeLightbox" aria-label="Close">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img :src="lightboxImage" class="lightbox-image" @click.stop alt="Zoomed image" />
      </div>
    </Transition>
  </Teleport>

  <!-- Mermaid Lightbox -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="lightboxMermaid"
        class="lightbox-overlay mermaid-lightbox-overlay"
        @click.self="closeMermaidLightbox"
      >
        <button class="lightbox-close" @click="closeMermaidLightbox" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="mermaid-lightbox-controls" @click.stop>
          <button class="mermaid-zoom-btn" @click="zoomOut" aria-label="Zoom out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="mermaid-zoom-btn mermaid-zoom-reset" @click="resetZoom" aria-label="Reset zoom">
            {{ Math.round(mermaidScale * 100) }}%
          </button>
          <button class="mermaid-zoom-btn" @click="zoomIn" aria-label="Zoom in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div
          class="mermaid-lightbox-content"
          :class="{ 'is-dragging': isDragging }"
          :style="{
            transform: `translate(${mermaidTranslate.x}px, ${mermaidTranslate.y}px) scale(${mermaidScale})`,
          }"
          @wheel.prevent="onMermaidWheel"
          @pointerdown.stop="onMermaidPointerDown"
          @pointermove="onMermaidPointerMove"
          @pointerup="onMermaidPointerUp"
          @pointercancel="onMermaidPointerUp"
          @click.stop
          v-html="lightboxMermaid"
        ></div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.md-content {
  display: block;
  max-width: var(--md-content-max-width, 688px);
  margin: 0 auto;
  padding: 0 10px;
  overflow-x: hidden;
}

/* Make images clickable */
:deep(img) {
  cursor: zoom-in;
  transition: opacity 0.2s;
}

:deep(img:hover) {
  opacity: 0.9;
}

/* Mermaid diagram styles */
:deep(.mermaid-diagram) {
  display: flex;
  justify-content: center;
  margin: 24px 0;
  overflow-x: auto;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  cursor: zoom-in;
  transition: box-shadow 0.2s;
}

:deep(.mermaid-diagram:hover) {
  box-shadow: 0 0 0 2px var(--md-c-brand, #42b883);
}

:deep(.mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
  pointer-events: none;
}

:deep(.mermaid-diagram-error) {
  border: 1px solid var(--md-c-yellow);
}

:deep(.mermaid-error) {
  color: var(--md-c-yellow);
  font-size: 13px;
  padding: 12px;
}

/* Lightbox Styles */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: zoom-out;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

/* Lightbox Transition */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.2s ease;
}

.lightbox-enter-active .lightbox-image,
.lightbox-leave-active .lightbox-image {
  transition: transform 0.2s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-from .lightbox-image {
  transform: scale(0.9);
}

.lightbox-leave-to .lightbox-image {
  transform: scale(0.9);
}

/* Mermaid Lightbox */
.mermaid-lightbox-overlay {
  cursor: default;
}

.mermaid-lightbox-controls {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  padding: 4px 6px;
  border-radius: 24px;
  z-index: 1;
}

.mermaid-zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.mermaid-zoom-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.mermaid-zoom-btn:active {
  background: rgba(255, 255, 255, 0.25);
}

.mermaid-zoom-reset {
  width: auto;
  padding: 0 10px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
}

.mermaid-lightbox-content {
  cursor: grab;
  transform-origin: center center;
  transition: none;
  touch-action: none;
  user-select: none;
}

.mermaid-lightbox-content.is-dragging {
  cursor: grabbing;
}

.mermaid-lightbox-content :deep(svg) {
  max-width: 90vw;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}
</style>
