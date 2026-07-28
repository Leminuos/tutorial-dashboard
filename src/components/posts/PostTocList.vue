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
  padding-left: 2px;
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
  display: block;
  padding: 7px 8px 7px calc(12px + var(--toc-indent, 0px));
  border-radius: 0 6px 6px 0;
  color: var(--md-c-text-2);
  font-size: 13.5px;
  line-height: 1.5;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.toc-link::before {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: -2px;
  width: 2px;
  content: '';
  background: transparent;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.toc-link.level-2 {
  color: var(--md-c-text-1);
  font-size: 14px;
  font-weight: 600;
}

.toc-link.level-4,
.toc-link.level-5 {
  font-size: 13px;
  color: var(--md-c-text-3);
}

.toc-link:hover {
  color: var(--md-c-text-1);
  background: var(--md-c-bg-soft);
}

.toc-link:hover::before {
  background: var(--md-c-divider);
}

.toc-link.active {
  color: var(--md-c-brand);
  background: transparent;
  font-weight: 600;
}

.toc-link.active::before {
  background: var(--md-c-brand);
}

/* In the mobile sheet there is room to wrap, and the rail helps read depth */
@media (max-width: 768px) {
  .toc-list {
    padding-left: 3px;
    border-left: 1px solid var(--md-c-divider-light);
  }

  .toc-link {
    display: -webkit-box;
    min-height: 42px;
    padding-top: 9px;
    padding-bottom: 9px;
    font-size: 14px;
    white-space: normal;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>
