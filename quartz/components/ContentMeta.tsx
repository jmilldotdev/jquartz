import { Date, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import readingTime from "reading-time"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { JSX } from "preact"
import style from "./styles/contentMeta.scss"

interface ContentMetaOptions {
  /**
   * Whether to display reading time
   */
  showReadingTime: boolean
  showComma: boolean
}

const defaultOptions: ContentMetaOptions = {
  showReadingTime: false,
  showComma: true,
}

export default ((opts?: Partial<ContentMetaOptions>) => {
  // Merge options with defaults
  const options: ContentMetaOptions = { ...defaultOptions, ...opts }

  const formatExternalHost = (externalUrl: string): string => {
    try {
      const { hostname } = new URL(externalUrl)
      return hostname.replace(/^www\./, "")
    } catch {
      return externalUrl.replace(/^https?:\/\//, "")
    }
  }

  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    const text = fileData.text
    const externalUrl = fileData.frontmatter?.url?.toString().trim()

    if (text || externalUrl) {
      const segments: (string | JSX.Element)[] = []

      if (text && fileData.dates) {
        segments.push(<Date date={getDate(cfg, fileData)!} locale={cfg.locale} />)
      }

      // Display reading time if enabled
      if (text && options.showReadingTime) {
        const { minutes, words: _words } = readingTime(text)
        const displayedTime = i18n(cfg.locale).components.contentMeta.readingTime({
          minutes: Math.ceil(minutes),
        })
        segments.push(<span>{displayedTime}</span>)
      }

      return (
        <div class={classNames(displayClass, "content-meta")}>
          {segments.length > 0 && (
            <p show-comma={options.showComma} class="content-meta__text">
              {segments}
            </p>
          )}
          {externalUrl && (
            <a
              class="content-meta__external"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{formatExternalHost(externalUrl)}</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )
    } else {
      return null
    }
  }

  ContentMetadata.css = style

  return ContentMetadata
}) satisfies QuartzComponentConstructor
