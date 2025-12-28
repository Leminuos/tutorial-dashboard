<script setup>

import { useRoute, RouterLink } from 'vue-router'
import { useDocsStore } from '@/stores/useDocsTree'
import { computed } from 'vue'

const route = useRoute()
const docs = useDocsStore()

const nav = computed(() => {
  const list = docs.flatLists

  if (!list?.length) return { prev: null, next: null }

  const idx = list.findIndex((x) => x.chapterId === route.params.chapter && x.pageId === route.params.page)
  if (idx < 0) return { prev: null, next: null }

  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
  }
})

</script>

<template>
  <nav class="docs-navfooter">
    <div class="navbar">
      <div class="nav-left">
        <RouterLink v-if="nav.prev" :to="nav.prev.to" class="nav-link">
          <div class="hint">Previous</div>
          <div class="title">{{ nav.prev.title }}</div>
        </RouterLink>
      </div>

      <div class="nav-right">
        <RouterLink v-if="nav.next" :to="nav.next.to" class="nav-link">
          <div class="hint">Next</div>
          <div class="title">{{ nav.next.title }}</div>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
@media (min-width: 1280px) {
  .docs-navfooter {
    padding-right: 224px;
  }
}

.navbar {
  max-width: 688px;
  display:flex;
  justify-content:space-between;
  gap: 16px;
  padding-top: 12px;
  padding-bottom: 48px;
  margin: 0 auto;
  border-top:1px solid var(--md-c-divider-light-2);
  margin-top:24px;
}

.nav-left, .nav-right { flex: 1; }
.nav-link:hover{ background: var(--md-c-white-mute); }

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-green);
  padding-top: 8px;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
  text-align: right;
}

.nav-link{
  text-decoration: none;
  color: inherit;
  display: inline-block;
  padding: 10px 12px;
  border-radius: 8px;
}

.hint{
  font-size: 12px;
  color: var(--md-c-text-light-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
