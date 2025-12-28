<script setup>
import { useRoute, RouterLink } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'
import { computed } from 'vue'

const emit = defineEmits(['select'])
const props = defineProps({
  toggleSidebar: { type: Boolean, required: true }
})

const route = useRoute()
const docs = useDocsStore()

const currentDoc = computed(() => {
  const tree = docs.tree
  if (!tree?.docs?.length) return null
  return tree.docs.find((d) => String(d.id) === route.params.section) ?? null
})
</script>

<template>
  <aside id="sidebar" class="docs-sidebar" :class="{ active: props.toggleSidebar }">
    <div class="sidebar-header">
      <h1 class="header">{{ currentDoc?.title || "Unknown" }}</h1>
    </div>

    <section
      class="sidebar-group"
      v-for="(chapter, index) in currentDoc?.chapters" :key="index"
    >
      <div class="title">
        <h2 class="title-text">{{ chapter.title }}</h2>
      </div>

      <router-link
        class="link"
        :class="{ active: page.id === route.params.page }"
        :to="`/docs/${currentDoc?.id}/${chapter.id}/${page.id}`"
        @click="emit('select')"
        v-for="page in chapter?.pages"
      >
        <p class="link-text">
          {{ page.title }}
        </p>
      </router-link>
    </section>

    <div class="sidebar-footer">Designed by Bui Nguyen</div>
  </aside>
</template>

<style scoped>
.docs-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  width: calc(var(--md-sidebar-expand) + 8px);
  background-color: var(--md-c-white);
  border-right: 1px solid var(--md-c-divider-light-2);
  overflow: auto;
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.docs-sidebar.active {
  padding: 32px 16px;
  transform: translateX(0);
}

@media (min-width: 960px) {
  .docs-sidebar {
    top: var(--md-nav-height);
    padding: 32px 16px;
    transform: translateX(0);
  }
}

@media (min-width: 1280px) {
  .docs-sidebar {
    padding: 32px;
    width: calc(var(--md-sidebar-expand) + 32px);
  }
}

@media (min-width: 1440px) {
  .docs-sidebar {
    width: calc(var(--md-sidebar-expand) + 100px);
    padding-left: 100px;
  }
}

@media (min-width: 1600px) {
  .docs-sidebar {
    width: calc(var(--md-sidebar-expand) + 150px);
    padding-left: 150px;
  }
}

@media (min-width: 1920px) {
  .docs-sidebar {
    width: calc(var(--md-sidebar-expand) + 200px);
    padding-left: 200px;
  }
}

.sidebar-header {
  color: var(--md-c-green);
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--md-c-divider-light-1);
}

.sidebar-group {
  margin-bottom: 24px;
}

.title {
  padding: 4px 0;
}

.title-text {
  line-height: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-text-light-1);
  transition: color .5s;
}

.link {
  display: block;
  padding: 4px 0;
}

.link.active .link-text {
  color: var(--md-c-green) !important;
  transition: color .25s;
}

.link-text {
  line-height: 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--md-c-text-light-2);
  transition: color .5s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}

.link:hover .link-text {
  color: var(--md-c-brand-text-1);
  transition: color .25s;
}

.sidebar-footer {
  padding-top: 20px;
  font-size: 12px;
  font-weight: 700;
  border-top: 1px solid var(--md-c-divider-light-2);
  color: var(--md-c-text-light-1);
}
</style>
