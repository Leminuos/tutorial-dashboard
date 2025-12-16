<script setup>
const emit = defineEmits(['toggle-sidebar'])
</script>

<template>
  <header id="header" class="docs-navbar">
    <div class="container">
      <div class="toggle-sidebar" @click="emit('toggle-sidebar')"><span></span></div>
    </div>
  </header>
</template>

<style scoped>
.docs-navbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1000;
  height: var(--md-nav-height);
  background-color: var(--md-c-white);
  border-bottom: 1px solid var(--md-c-divider-light-2);
  transition: 0.5s ease-out;
}

@media (min-width: 960px) {
  .docs-navbar {
    display: none;
  }
}

.container {
  display: flex;
  justify-content: end;
  align-items: center;
  max-width: 688px;
  height: 100%;
  margin: 0 auto;
}

.toggle-sidebar {
  position: relative;
  width: 28px;
  height: 20px;
  margin-right: 15px;
  cursor: pointer;
}

.toggle-sidebar::before,
.toggle-sidebar::after,
.toggle-sidebar span {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--md-c-divider-light-2);
  transition: transform 0.25s ease, opacity 0.25s ease;
}

/* Top line */
.toggle-sidebar::before {
  top: 0;
}

/* Middle line */
.toggle-sidebar span {
  top: 50%;
  transform: translateY(-50%);
}

/* Bottom line */
.toggle-sidebar::after {
  bottom: 0;
}

@media (min-width: 768px) {
  .toggle-sidebar {
    margin-right: 0;
  }
}
</style>
