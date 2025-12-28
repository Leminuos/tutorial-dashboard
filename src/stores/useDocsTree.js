import { defineStore } from 'pinia'

export const useDocsStore = defineStore('docs', {
  state: () => ({
    tree: null,
    flatLists: null,
  }),

  getters: {
    /**
     * Get a document by section ID
     * @param {string} sectionId - Section ID
     * @returns {object | null}
     */
    getDocBySectionId: (state) => (sectionId) => {
      if (!state.tree?.docs?.length) return null
      return state.tree.docs.find((d) => String(d.id) === String(sectionId)) ?? null
    },
  },

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
