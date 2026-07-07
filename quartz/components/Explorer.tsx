import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/explorer.scss"

// @ts-ignore
import script from "./scripts/explorer.inline"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { FileTrieNode } from "../util/fileTrie"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"

type OrderEntries = "sort" | "filter" | "map"

export interface Options {
  title?: string
  folderDefaultState: "collapsed" | "open"
  folderClickBehavior: "collapse" | "link"
  useSavedState: boolean
  sortFn: (a: FileTrieNode, b: FileTrieNode) => number
  filterFn: (node: FileTrieNode) => boolean
  mapFn: (node: FileTrieNode) => void
  order: OrderEntries[]
}

const defaultOptions: Options = {
  folderDefaultState: "collapsed",
  folderClickBehavior: "link",
  useSavedState: true,
  mapFn: (node) => {
    return node
  },
  sortFn: (a, b) => {
    // Sort order: folders first, then newest captured/created content, then alphabetical.
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1
    }

    const aStack = [a]
    let aTime = Number.NEGATIVE_INFINITY
    while (aStack.length > 0) {
      const node = aStack.pop()
      if (!node) continue
      const rawDate = node.data?.date as Date | string | undefined
      const ownTime =
        rawDate instanceof Date
          ? rawDate.getTime()
          : rawDate
            ? Date.parse(rawDate)
            : Number.NEGATIVE_INFINITY
      if (!Number.isNaN(ownTime)) {
        aTime = Math.max(aTime, ownTime)
      }
      aStack.push(...node.children)
    }

    const bStack = [b]
    let bTime = Number.NEGATIVE_INFINITY
    while (bStack.length > 0) {
      const node = bStack.pop()
      if (!node) continue
      const rawDate = node.data?.date as Date | string | undefined
      const ownTime =
        rawDate instanceof Date
          ? rawDate.getTime()
          : rawDate
            ? Date.parse(rawDate)
            : Number.NEGATIVE_INFINITY
      if (!Number.isNaN(ownTime)) {
        bTime = Math.max(bTime, ownTime)
      }
      bStack.push(...node.children)
    }

    const aHasDate = Number.isFinite(aTime)
    const bHasDate = Number.isFinite(bTime)

    if (aHasDate && bHasDate && aTime !== bTime) {
      return bTime - aTime
    } else if (aHasDate && !bHasDate) {
      return -1
    } else if (!aHasDate && bHasDate) {
      return 1
    }

    // numeric: true: Whether numeric collation should be used, such that "1" < "2" < "10"
    // sensitivity: "base": Only strings that differ in base letters compare as unequal. Examples: a ≠ b, a = á, a = A
    return a.displayName.localeCompare(b.displayName, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  },
  filterFn: (node) => node.slugSegment !== "tags",
  order: ["filter", "map", "sort"],
}

export type FolderState = {
  path: string
  collapsed: boolean
}

let numExplorers = 0
export default ((userOpts?: Partial<Options>) => {
  const opts: Options = { ...defaultOptions, ...userOpts }
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()

  const Explorer: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
    const id = `explorer-${numExplorers++}`

    return (
      <div
        class={classNames(displayClass, "explorer")}
        data-behavior={opts.folderClickBehavior}
        data-collapsed={opts.folderDefaultState}
        data-savestate={opts.useSavedState}
        data-data-fns={JSON.stringify({
          order: opts.order,
          sortFn: opts.sortFn.toString(),
          filterFn: opts.filterFn.toString(),
          mapFn: opts.mapFn.toString(),
        })}
      >
        <button
          type="button"
          class="explorer-toggle mobile-explorer hide-until-loaded"
          data-mobile={true}
          aria-controls={id}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-menu"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="title-button explorer-toggle desktop-explorer"
          data-mobile={false}
          aria-expanded={true}
        >
          <h2>{opts.title ?? i18n(cfg.locale).components.explorer.title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id={id} class="explorer-content" aria-expanded={false} role="group">
          <OverflowList class="explorer-ul" />
        </div>
        <template id="template-file">
          <li>
            <a href="#"></a>
          </li>
        </template>
        <template id="template-folder">
          <li>
            <div class="folder-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="5 8 14 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="folder-icon"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <div>
                <button class="folder-button">
                  <span class="folder-title"></span>
                </button>
              </div>
              <button
                type="button"
                class="folder-random"
                aria-label="Jump to a random page in this folder"
                title="Random item"
                data-random-page="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4"></rect>
                  <circle cx="9" cy="8" r="1.2" fill="currentColor"></circle>
                  <circle cx="15" cy="8" r="1.2" fill="currentColor"></circle>
                  <circle cx="9" cy="12" r="1.2" fill="currentColor"></circle>
                  <circle cx="15" cy="12" r="1.2" fill="currentColor"></circle>
                  <circle cx="9" cy="16" r="1.2" fill="currentColor"></circle>
                  <circle cx="15" cy="16" r="1.2" fill="currentColor"></circle>
                </svg>
              </button>
            </div>
            <div class="folder-outer">
              <ul class="content"></ul>
            </div>
          </li>
        </template>
      </div>
    )
  }

  Explorer.css = style
  Explorer.afterDOMLoaded = concatenateResources(script, overflowListAfterDOMLoaded)
  return Explorer
}) satisfies QuartzComponentConstructor
