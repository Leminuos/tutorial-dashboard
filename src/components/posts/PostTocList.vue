<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  activeId: { type: String, default: '' },
})

defineEmits(['select'])
</script>

<template>
  <nav class="toc-list" aria-label="Mục lục bài viết">
    <a
      v-for="item in items"
      :key="item.id"
      :href="`#${item.id}`"
      class="toc-link"
      :class="[`level-${item.level}`, { active: activeId === item.id }]"
      :style="{ '--toc-indent': `${Math.max(item.level - 2, 0) * 12}px` }"
      @click.prevent="$emit('select', item.id)"
    >
      {{ item.text }}
    </a>
  </nav>
</template>

<style scoped>
.toc-list {
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--md-c-divider) transparent;
}

.toc-link {
  position: relative;
  /* Flex items must keep their natural height, otherwise the text is squeezed */
  flex: 0 0 auto;
  display: -webkit-box;
  padding: 6px 10px 6px calc(16px + var(--toc-indent, 0px));
  border-radius: 0 6px 6px 0;
  color: var(--md-c-text-2);
  font-size: 13.5px;
  line-height: 1.5;
  text-decoration: none;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  transition:
    color 0.2s,
    background-color 0.2s;
}

/* Continuous rail: every row draws its own slice, the active row thickens it */
.toc-link::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  content: '';
  background: var(--md-c-divider-light);
  transition:
    width 0.2s,
    background-color 0.2s;
}

.toc-link.level-2 {
  color: var(--md-c-text-1);
  font-weight: 500;
}

.toc-link.level-3 {
  font-size: 13px;
}

.toc-link.level-4,
.toc-link.level-5 {
  font-size: 12.5px;
  color: var(--md-c-text-3);
}

.toc-link:hover {
  color: var(--md-c-brand);
}

.toc-link:focus-visible {
  outline: 2px solid var(--md-c-brand);
  outline-offset: -2px;
}

.toc-link.active {
  color: var(--md-c-brand);
  background: color-mix(in srgb, var(--md-c-brand) 9%, transparent);
  font-weight: 600;
}

.toc-link.active::before {
  width: 2px;
  background: var(--md-c-brand);
}

/* The mobile sheet has more room and needs bigger tap targets */
@media (max-width: 768px) {
  .toc-link {
    min-height: 42px;
    padding-top: 10px;
    padding-bottom: 10px;
    font-size: 14px;
  }

  .toc-link.level-4,
  .toc-link.level-5 {
    font-size: 13.5px;
  }
}
</style>
