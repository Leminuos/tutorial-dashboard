<script setup>
import FooterDocument from '@/components/docs/FooterDocument.vue'
import SidebarDocument from '@/components/docs/SidebarDocument.vue'
import MarkdownDocument from '@/components/docs/MarkdownDocument.vue'
import githubConfig from '@/config/github.config'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useDocsStore } from '@/stores/docstree'

const route = useRoute()
const docs = useDocsStore()

const OWNER     = githubConfig.github.owner  || "YOUR_OWNER"
const REPO      = githubConfig.github.repo   || "YOUR_REPO"
const BRANCH    = githubConfig.github.branch || "master"

const markdownSrc = computed(() => {
  const tree = docs.tree
  if (!tree?.docs?.length) return null
  const section = tree.docs.find((d) => String(d.id) === String(route.params.section))
  if (!section) return null

  const chapter = (section.chapters).find((c) => String(c.id) === String(route.params.chapter))
  if (!chapter) return null

  const page = (chapter.pages).find((p) => String(p.id) === String(route.params.page))
  if (!chapter) return null

  const path = page.path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`
})

</script>

<template>
  <!-- header -->
  <!-- <header-document /> -->

  <!-- sidebar -->
  <sidebar-document />

  <!-- Content -->
  <div id="content" class="docs-content">

    <markdown-document :src="markdownSrc" />

    <footer-document />

  </div>
</template>

<style scoped>
@media (min-width: 960px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 8px);
    padding-right: 8px;
  }
}

@media (min-width: 1280px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 32px);
    padding-right: 32px;
  }
}

@media (min-width: 1440px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 100px);
    padding-right: 100px;
  }
}

@media (min-width: 1600px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 150px);
    padding-right: 150px;
  }
}

@media (min-width: 1920px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 200px);
    padding-right: 200px;
  }
}
</style>
