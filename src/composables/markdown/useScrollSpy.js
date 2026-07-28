import { onBeforeUnmount, ref } from "vue"

const ACTIVATE_AFTER_SCROLL_Y = 8;

/**
 * Đánh dấu heading đang đọc.
 *
 * Cách làm: mỗi lần cuộn, quét vị trí thật của các heading và lấy heading cuối
 * cùng đã đi qua vạch ngay dưới header. Trước đây dùng IntersectionObserver,
 * nhưng callback của nó chỉ trả về các heading vừa *đổi trạng thái* chứ không
 * phải toàn bộ heading đang hiển thị, nên mục active hay bị trễ một nấc.
 */
export function useScrollSpy(contentElRef) {
  const activeId = ref("");
  let headings = [];
  let onScroll = null;
  let ticking = false;

  function getOffset() {
    const navHeight = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--md-nav-height") || "50"
    )
    // Cùng mốc với offset lúc click vào mục lục, cộng thêm biên an toàn
    return navHeight + 24
  }

  function update() {
    ticking = false
    if (!headings.length) return

    if (window.scrollY <= ACTIVATE_AFTER_SCROLL_Y) {
      activeId.value = ""
      return
    }

    // Cuộn tới đáy trang: heading cuối luôn là mục đang đọc, vì nó có thể
    // không bao giờ chạm được tới vạch đánh dấu.
    const reachedBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 2

    if (reachedBottom) {
      activeId.value = headings[headings.length - 1].id
      return
    }

    const offset = getOffset()
    let current = ""

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top - offset > 1) break
      current = heading.id
    }

    activeId.value = current
  }

  function requestUpdate() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }

  function removeListeners() {
    if (!onScroll) return
    window.removeEventListener("scroll", onScroll)
    window.removeEventListener("resize", onScroll)
    onScroll = null
  }

  function setup() {
    removeListeners()
    activeId.value = ""
    headings = []

    if (!contentElRef.value) return

    headings = Array.from(
      contentElRef.value.querySelectorAll("h2[id],h3[id],h4[id],h5[id]")
    )

    if (!headings.length) return

    onScroll = requestUpdate
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    update()
  }

  function cleanup() {
    removeListeners()
    headings = []
    activeId.value = "";
  }

  onBeforeUnmount(cleanup)

  return { activeId, setup }
}
