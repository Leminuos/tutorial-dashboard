<script setup>
import { computed } from 'vue'
import { buildRawUrl } from '@/stores/docstree'

const props = defineProps({
  post: {
    type: Object,
    required: true
  },
  // The root path of the category, e.g. "esp32"
  // Used to resolve relative image paths
  basePath: {
    type: String,
    required: true
  }
})

// Parse date string DD-MM-YYYY
const dateObj = computed(() => {
  if (!props.post.date) return { day: '01', month: '01' }
  const parts = props.post.date.split('-')
  if (parts.length === 3) {
    return {
      day: parts[0],
      month: `Th${parseInt(parts[1], 10)}`
    }
  }
  return { day: '01', month: '01' }
})

// Resolve image URL
const imageUrl = computed(() => {
  if (!props.post.image) return null
  if (props.post.image.startsWith('http')) return props.post.image

  // Combine base path + image path
  // If basePath is "esp32" and image is "img/foo.png" -> "esp32/img/foo.png"
  const fullPath = `${props.basePath}/${props.post.image}`
  return buildRawUrl(fullPath)
})

</script>

<template>
  <div class="post-card">
    <!-- Date Badge -->
    <div class="date-badge">
      <span class="day">{{ dateObj.day }}</span>
      <span class="month">{{ dateObj.month }}</span>
    </div>

    <!-- Thumbnail -->
    <div class="thumbnail">
      <img v-if="imageUrl" :src="imageUrl" :alt="post.title" loading="lazy">
      <div v-else class="placeholder-img">
        <span>No Image</span>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <h3 class="title">{{ post.title }}</h3>
      <div class="meta" v-if="post.author">
        <span class="author">By {{ post.author }}</span>
      </div>
      <p class="description">{{ post.description }}</p>
    </div>
  </div>
</template>

<style scoped>
.post-card {
  display: flex;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 180px;
  position: relative;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Date Badge */
.date-badge {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--md-c-brand-light, #e0f2f1);
  color: var(--md-c-brand, #009688);
  width: 60px;
  min-width: 60px;
  padding: 8px;
  font-weight: 700;
  border-right: 1px solid #f0f0f0;
}

.date-badge .day {
  font-size: 24px;
  line-height: 1;
}

.date-badge .month {
  font-size: 14px;
  text-transform: uppercase;
}

/* Thumbnail */
.thumbnail {
  width: 280px;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.post-card:hover .thumbnail img {
  transform: scale(1.05);
}

.placeholder-img {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 12px;
}

/* Content */
.content {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--md-c-text-1);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}

.description {
  margin: 0;
  font-size: 14px;
  color: var(--md-c-text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .post-card {
    flex-direction: column;
    height: auto;
  }

  .date-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 10;
    width: auto;
    min-width: auto;
    padding: 4px 8px;
    border-radius: 4px;
    flex-direction: row;
    gap: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    border: none;
    background: rgba(255, 255, 255, 0.9);
  }

  .date-badge .day { font-size: 16px; }

  .thumbnail {
    width: 100%;
    height: 180px;
  }

  .content {
    padding: 16px;
  }
}
</style>
