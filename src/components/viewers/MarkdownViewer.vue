<script setup>
import '@/assets/css/markdown.css'
import { ref, watch, watchEffect, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { createMarkdownRenderer } from '@/service/markdown/createMarkdownRenderer'
import { useShikiHighlighter } from '@/service/shiki/useShikiHighlighter'
import { useScrollSpy } from '@/composables/markdown/useScrollSpy'

const props = defineProps({
  src: { type: String, required: true },
  maxWidth: { type: String, default: '688px' },
})

const emit = defineEmits(['toc-update', 'toc-active'])

const html = ref('Loading...')
const tocItems = ref([])

const contentEl = ref(null)     // gắn vào element chứa v-html

const { render } = createMarkdownRenderer()
const { highlightMarkdownHtml } = useShikiHighlighter()
const { activeId, setup: setupScrollSpy } = useScrollSpy(contentEl)

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
  const btn = e.target.closest('.code-copy');
  if (!btn) return;

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

    html.value = await highlightMarkdownHtml(rawHtml, {
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
  setupScrollSpy()
})

onMounted(async () => {
  contentEl.value?.addEventListener('click', onContentClick);
});

onBeforeUnmount(() => {
  contentEl.value?.removeEventListener('click', onContentClick);
})

</script>

<template>
  <article ref="contentEl" class="md-content" :style="{ '--md-content-max-width': props.maxWidth }" v-html="html"></article>
</template>

<style scoped>
.md-content {
  display: block;
  max-width: var(--md-content-max-width, 688px);
  margin: 0 auto;
  padding: 0 10px;
  overflow-x: hidden;
}
</style>
