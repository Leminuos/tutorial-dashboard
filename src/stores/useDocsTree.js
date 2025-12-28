import { defineStore } from 'pinia'

export const useDocsStore = defineStore('docs', {
  state: () => ({
    tree: null,
    flatLists: null,
  }),

  getters: {},

  actions: {
    async load() {
      if (this.tree && this.flatLists) return

      const res = await fetch(`${import.meta.env.BASE_URL}/docs/index.json`, { cache: 'no-cache' })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Failed to load /docs/index.json: ${res.status} ${res.statusText}\n${text}`)
      }

      const json = await res.json()
      this.tree = json.tree || null
      this.flatLists = json.flatLists || null
    },
  }
})
