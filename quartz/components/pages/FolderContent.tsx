import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

import style from "../styles/listPage.scss"
import { PageList, SortFn } from "../PageList"
import { Root } from "hast"
import { htmlToJsx } from "../../util/jsx"
import { i18n } from "../../i18n"
import { QuartzPluginData } from "../../plugins/vfile"
import { ComponentChildren } from "preact"
import { concatenateResources } from "../../util/resources"
import { trieFromAllFiles } from "../../util/ctx"
import { stripSlashes, trimSuffix, isFolderPath } from "../../util/path"

interface FolderContentOptions {
  /**
   * Whether to display number of folders
   */
  showFolderCount: boolean
  showSubfolders: boolean
  sort?: SortFn
}

const defaultOptions: FolderContentOptions = {
  showFolderCount: true,
  showSubfolders: true,
}

export default ((opts?: Partial<FolderContentOptions>) => {
  const options: FolderContentOptions = { ...defaultOptions, ...opts }

  const FolderContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props

    const trie = (props.ctx.trie ??= trieFromAllFiles(allFiles))
    const folderSlug = stripSlashes(trimSuffix(fileData.slug!, "index"))
    const folder = trie.findNode(fileData.slug!.split("/"))

    const pageMap = new Map<string, QuartzPluginData>()

    if (folder) {
      for (const node of folder.children) {
        if (node.data) {
          pageMap.set(node.data.slug!, node.data)
          continue
        }

        if (node.isFolder && options.showSubfolders) {
          const getMostRecentDates = (): QuartzPluginData["dates"] => {
            let maybeDates: QuartzPluginData["dates"] | undefined = undefined
            for (const child of node.children) {
              if (child.data?.dates) {
                if (!maybeDates) {
                  maybeDates = { ...child.data.dates }
                } else {
                  if (child.data.dates.created > maybeDates.created) {
                    maybeDates.created = child.data.dates.created
                  }

                  if (child.data.dates.modified > maybeDates.modified) {
                    maybeDates.modified = child.data.dates.modified
                  }

                  if (child.data.dates.published > maybeDates.published) {
                    maybeDates.published = child.data.dates.published
                  }
                }
              }
            }
            return (
              maybeDates ?? {
                created: new Date(),
                modified: new Date(),
                published: new Date(),
              }
            )
          }

          pageMap.set(node.slug, {
            slug: node.slug,
            filePath: node.data?.filePath,
            dates: getMostRecentDates(),
            frontmatter: {
              title: node.displayName,
              tags: [],
            },
          } as QuartzPluginData)
        }
      }
    }

    for (const page of allFiles) {
      const slug = page.slug ?? ""
      if (!slug || isFolderPath(slug)) continue

      if (
        (folderSlug.length === 0 && !slug.includes("/")) ||
        (folderSlug.length > 0 && slug.startsWith(`${folderSlug}/`))
      ) {
        pageMap.set(slug, page)
      }
    }

    const allPagesInFolder = Array.from(pageMap.values())
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = cssClasses.join(" ")
    const listProps = {
      ...props,
      sort: options.sort,
      allFiles: allPagesInFolder,
    }

    const content = (
      (tree as Root).children.length === 0
        ? fileData.description
        : htmlToJsx(fileData.filePath!, tree)
    ) as ComponentChildren

    return (
      <div class="popover-hint">
        <article class={classes}>{content}</article>
        <div class="page-listing">
          {options.showFolderCount && (
            <p>
              {i18n(cfg.locale).pages.folderContent.itemsUnderFolder({
                count: allPagesInFolder.length,
              })}
            </p>
          )}
          <div>
            <PageList {...listProps} />
          </div>
        </div>
      </div>
    )
  }

  FolderContent.css = concatenateResources(style, PageList.css)
  return FolderContent
}) satisfies QuartzComponentConstructor
