<script setup>
const emit = defineEmits(['toggle-sidebar', 'this-page'])
</script>

<template>
  <header id="header" class="docs-navbar">
    <div class="container">
      <div class="toggle-sidebar" @click="emit('toggle-sidebar')"><span></span></div>
      <div class="this-page" @click="emit('this-page')">On this page</div>
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

.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 688px;
  height: 100%;
  margin: 0 auto;
}

.toggle-sidebar {
  position: relative;
  width: 20px;
  height: 14px;
  margin-left: 15px;
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
  background-color: var(--md-c-text-light-3);
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

.toggle-sidebar:hover span,
.toggle-sidebar:hover::before,
.toggle-sidebar:hover::after {
  background-color: var(--md-c-text-light-1);
}

.this-page {
  font-size: 12px;
  font-weight: 500;
  line-height: 24px;
  color: var(--md-c-text-light-2);
  margin-right: 15px;
  cursor: pointer;
  transition: color .5s;
  user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
}

.this-page:hover {
  color: var(--md-c-text-light-1);
}

@media (min-width: 960px) {
  .docs-navbar {
    display: none;
  }
}

@media (min-width: 768px) {
  .toggle-sidebar {
    margin-left: 0;
  }

  .this-page {
    margin-right: 0;
  }
}
</style>
