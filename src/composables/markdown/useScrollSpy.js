import { ref, onBeforeUnmount } from "vue"

const ACTIVATE_AFTER_SCROLL_Y = 8;

export function useScrollSpy(contentElRef) {
  const activeId = ref("");
  let observer = null;
  let onScroll = null;

  function setup() {
    if (!contentElRef.value) return

    activeId.value = "";
    const headings = Array.from(
      contentElRef?.value.querySelectorAll('h2[id],h3[id],h4[id],h5[id]')
    )

    if (!headings.length) return

    if (observer) observer.disconnect()
    if (onScroll) window.removeEventListener("scroll", onScroll)

    let firstTop = headings[0].getBoundingClientRect().top + window.scrollY;

    observer = new IntersectionObserver(
      (entries) => {
        if (window.scrollY <= ACTIVATE_AFTER_SCROLL_Y) return;

        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]?.target?.id) {
          activeId.value = visible[0].target.id
        }
      },
      {
        root: null,
        rootMargin: '0% 0px -70% 0px',
        threshold: [0, 1],
      }
    )

    headings.forEach(h => observer.observe(h))

    onScroll = () => {
      const y = window.scrollY
      const offset = ACTIVATE_AFTER_SCROLL_Y
      if (y < firstTop - offset) activeId.value = ""
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
  }

  function cleanup() {
    if (observer) observer.disconnect();
    observer = null;

    if (onScroll) window.removeEventListener("scroll", onScroll);
    onScroll = null;

    activeId.value = "";
  }

  onBeforeUnmount(cleanup)

  return { activeId, setup }
}
