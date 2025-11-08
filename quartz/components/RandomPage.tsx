import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/random-page.scss"
// @ts-ignore: bundled at build time
import randomPageScript from "./scripts/random-page.inline"

const RandomPage: QuartzComponent = ({ allFiles }: QuartzComponentProps) => {
  const slugs = Array.from(
    new Set(
      allFiles
        .map((file) => file.slug)
        .filter(
          (slug): slug is string =>
            Boolean(slug) && slug !== "index" && !slug.startsWith("tags/") && !slug.endsWith("/index"),
        ),
    ),
  )

  if (slugs.length === 0) {
    return null
  }

  return (
    <div class="random-page">
      <button
        type="button"
        class="random-page-button"
        data-random-page="true"
        data-random-slugs={JSON.stringify(slugs)}
      >
        Random Page
      </button>
    </div>
  )
}

RandomPage.css = style
RandomPage.afterDOMLoaded = randomPageScript

export default (() => RandomPage) satisfies QuartzComponentConstructor
