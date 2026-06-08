import { nextTick } from 'vue'

export type RecentUpdatedDoc = {
  link: string
  title: string
  updatedAt: number
}

const STORAGE_PREFIX = 'notionnext:docs-read:'
const SIDEBAR_ITEM_SELECTOR = '.VPSidebarItem'

function normalizePath(value: string) {
  try {
    const url = new URL(value, window.location.origin)
    let pathname = decodeURIComponent(url.pathname)

    if (pathname.length > 1) {
      pathname = pathname.replace(/\/$/, '')
    }

    return pathname
  } catch {
    return value.replace(/[?#].*$/, '').replace(/\/$/, '')
  }
}

function readKey(link: string) {
  return `${STORAGE_PREFIX}${normalizePath(link)}`
}

function getReadTime(link: string) {
  const value = window.localStorage.getItem(readKey(link))
  return value ? Number(value) : 0
}

function markCurrentPageRead(items: RecentUpdatedDoc[], currentPath: string) {
  const current = normalizePath(currentPath)
  const item = items.find((doc) => normalizePath(doc.link) === current)

  if (!item) {
    return
  }

  window.localStorage.setItem(readKey(item.link), String(Date.now()))
}

function getUnreadItems(items: RecentUpdatedDoc[]) {
  return items.filter((item) => item.updatedAt > getReadTime(item.link))
}

function clearUnreadMarkers() {
  document.querySelectorAll('.nn-unread-leaf, .nn-has-unread').forEach((element) => {
    element.classList.remove('nn-unread-leaf', 'nn-has-unread')
  })
}

function markSidebarParents(anchor: Element) {
  let current = anchor.parentElement

  while (current) {
    if (current.matches(SIDEBAR_ITEM_SELECTOR)) {
      current.classList.add('nn-has-unread')
    }

    current = current.parentElement
  }
}

function markNavParents(unreadItems: RecentUpdatedDoc[]) {
  const hasUnreadChangelog = unreadItems.some((item) =>
    normalizePath(item.link).startsWith('/user-guide/changelog')
  )

  if (!hasUnreadChangelog) {
    return
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = normalizePath(anchor.getAttribute('href') || '')

    if (href === '/user-guide/changelog/latest') {
      anchor.classList.add('nn-unread-leaf')
    }
  })
}

function applyUnreadMarkers(items: RecentUpdatedDoc[]) {
  clearUnreadMarkers()

  const unreadItems = getUnreadItems(items)
  const unreadLinks = new Set(unreadItems.map((item) => normalizePath(item.link)))

  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = normalizePath(anchor.getAttribute('href') || '')

    if (!unreadLinks.has(href)) {
      return
    }

    anchor.classList.add('nn-unread-leaf')
    markSidebarParents(anchor)
  })

  markNavParents(unreadItems)
}

export async function syncUnreadUpdates(items: RecentUpdatedDoc[] | undefined, currentPath: string) {
  if (typeof window === 'undefined' || !Array.isArray(items) || items.length === 0) {
    return
  }

  markCurrentPageRead(items, currentPath)
  await nextTick()
  applyUnreadMarkers(items)
}
