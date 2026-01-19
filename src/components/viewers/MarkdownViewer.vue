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

const contentEl = ref(null)     // gắn vào element chứa v-html

// Image lightbox state
const lightboxImage = ref(null)

const { render } = createMarkdownRenderer()
const { highlightMarkdownHtml } = useShikiHighlighter()
const { activeId, setup: setupScrollSpy } = useScrollSpy(contentEl)
const { markMermaidBlocks, renderMermaidPlaceholders } = useMermaidRenderer()

function wrapShikiBlock(shikiHtml, lang) {
  const safeLang = (lang || 'text').toLowerCase()

  return `
    <div class="code-block"">
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
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

function onContentClick(e) {
  // Handle code copy button
  const btn = e.target.closest('.code-copy');
  if (btn) {
    const block = btn.closest('.code-block');
    const pre = block?.querySelector('pre');
    const code = pre?.textContent || '';

    copyToClipboard(code).then((ok) => {
      if (!ok) return;

      btn.classList.add('copied');
      setTimeout(() => {
        btn.classList.remove('copied');
      }, 1200);
    });
    return;
  }

  // Handle image click for lightbox
  const img = e.target.closest('img');
  if (img && !img.closest('.mermaid-diagram')) {
    lightboxImage.value = img.src;
  }
}

function closeLightbox() {
  lightboxImage.value = null;
}

function handleKeydown(e) {
  if (e.key === 'Escape' && lightboxImage.value) {
    closeLightbox();
  }
}

watch(activeId, (id) => {
  emit('toc-active', id)
}, { immediate: true })

watchEffect(async () => {
  try {
    const res = await fetch(props.src)
    const md_text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${md_text}`);

    const md_url = res.url
    const { html: rawHtml, toc } = render(md_text, md_url);

    // Mark mermaid blocks before Shiki highlighting
    const markedHtml = markMermaidBlocks(rawHtml)

    // Highlight code with Shiki
    html.value = await highlightMarkdownHtml(markedHtml, {
      theme: 'one-dark-pro',
      wrap: wrapShikiBlock
    })

    tocItems.value = toc
    emit('toc-update', toc)
  }
  catch (err) {
    console.error("Fetch failed:", err)

    html.value = "Loading..."
    tocItems.value = []
  }

  await nextTick()

  // Render mermaid diagrams after HTML is mounted
  await renderMermaidPlaceholders(contentEl.value)

  setupScrollSpy()
})

onMounted(async () => {
  contentEl.value?.addEventListener('click', onContentClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  contentEl.value?.removeEventListener('click', onContentClick);
  document.removeEventListener('keydown', handleKeydown);
})

</script>

<template>
  <article ref="contentEl" class="md-content" :style="{ '--md-content-max-width': props.maxWidth }" v-html="html"></article>

  <!-- Image Lightbox -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div v-if="lightboxImage" class="lightbox-overlay" @click="closeLightbox">
        <button class="lightbox-close" @click="closeLightbox" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img :src="lightboxImage" class="lightbox-image" @click.stop alt="Zoomed image">
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
  background: var(--md-c-bg-soft);
  border-radius: 8px;
}

:deep(.mermaid-diagram svg) {
  max-width: 100%;
  height: auto;
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
</style>
