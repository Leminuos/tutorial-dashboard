<script setup>
import { computed, onBeforeMount } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

const route = useRoute()
const layout = computed(() => route.meta.layout || 'div')
const docs = useDocsStore()

onBeforeMount(async () => {
  await docs.load()
});

</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<style scoped></style>
