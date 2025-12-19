<script setup>
import '@/assets/css/markdown.css'
import { useRoute } from 'vue-router'
import { ref, watchEffect, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { createMarkdownRenderer } from '@/service/markdown/createMarkdownRenderer'
import { useShikiHighlighter } from '@/service/shiki/useShikiHighlighter'
import { useScrollSpy } from '@/composables/markdown/useScrollSpy'

const props = defineProps({
  src: { type: String, required: true },
  mobile: { type: Boolean },
  tocActive: { type: Boolean },
})

const emit = defineEmits(['select-toc'])

const route = useRoute()
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
  } catch {
    console.error("Fetch failed:", err)

    html.value = "Loading..."
    tocItems.value = []
  }

  if (!props.mobile)
  {
    await nextTick()
    setupScrollSpy()
  }
})

onMounted(async () => {
  contentEl.value?.addEventListener('click', onContentClick);
});

onBeforeUnmount(() => {
  contentEl.value?.removeEventListener('click', onContentClick);
})

</script>

<template>
  <div class="md-page">
    <article ref="contentEl" class="md-content" v-html="html"></article>

    <aside class="md-toc" :class="{popup: tocActive}">
      <div class="toc-title">MỤC LỤC</div>

      <nav class="toc-nav">
        <a
          v-for="item in tocItems"
          :key="item.id"
          :href="`#/docs/${route.params.section}/${route.params.chapter}/${route.params.page}#${item.id}`"
          class="toc-link"
          :class="{ active: !props.mobile && item.id === activeId }"
          :style="{ paddingLeft: `${(item.level - 2) * 12}px` }"
          @click="emit('select-toc')"
        >
          {{ item.text }}
        </a>
      </nav>
    </aside>
  </div>
</template>

<style scoped>
.md-page {
  display: flex;
  padding: 24px 0;
}

@media (min-width: 960px) {
  .md-page {
    padding: 48px 0;
  }
}

.md-content {
  display: block;
  max-width: 688px;
  margin: 0 auto;
  padding: 0 10px;
  overflow-x: hidden;
}

.md-toc {
  position: sticky;
  top: calc(var(--md-nav-height) + 12px);
  width: 224px;
  max-height: calc(100vh - 48px);
  overflow: auto;
  display: none;
}

.md-toc.popup {
  display: block;
  position: fixed;
  top: calc(var(--md-nav-height) + 60px);
  left: 50%;
  width: calc(100% - 24px);
  max-width: 688px;
  max-height: calc(50vh - 48px);
  transform: translateX(-50%);
  border-radius: 8px;
  border: 1px solid var(--md-c-divider-light-1);
  background-color: var(--md-c-white);
  padding: 16px 20px;
  overflow: auto;
  box-shadow: var(--md-shadow-3);
}

.md-toc.popup .toc-title {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--md-c-divider-light-2);
}

.md-toc .toc-title {
  font-weight: 800;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.md-toc .toc-link {
  display: block;
  padding: 6px 0;
  color: var(--md-c-text-light-2);
  font-size: 14px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}

.md-toc .toc-link.active,
.md-toc .toc-link:hover {
  color: var(--md-c-text-light-1);
  font-weight: 600;
}

@media (min-width: 1280px) {
  .md-toc {
    display: block;
  }
}

</style>
