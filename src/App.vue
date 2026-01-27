<script setup>
import { computed, onBeforeMount } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const route = useRoute()
const layout = computed(() => route.meta.layout || 'div')
const docs = useDocsStore()

onBeforeMount(async () => {
  await docs.load()
});

</script>

<template>
  <Transition name="fade">
    <LoadingSpinner v-if="docs.loading && !docs.tree" />
  </Transition>

  <component :is="layout">
    <RouterView />
  </component>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
