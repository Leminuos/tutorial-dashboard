<script setup>
import FooterDocument from '@/components/docs/FooterDocument.vue';
import HeaderMain from '@/components/main/HeaderMain.vue'
</script>

<template>
  <header-main />

  <div id="content">
    <slot />
  </div>

  <footer-document />

</template>

<style scoped></style>
