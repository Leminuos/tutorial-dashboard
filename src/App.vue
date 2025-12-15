<script setup>
import { onBeforeMount } from 'vue'
import { useDocsStore } from '@/stores/docstree'

const docs = useDocsStore()

onBeforeMount(async () => {
  await docs.load()
});

</script>

<template>
  <div></div>
</template>

<style scoped></style>
