import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (title) {
    return <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
  } else {
    return null
  }
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
  font-size: clamp(2rem, 3vw, 2.6rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tertiary);
  text-shadow: 0 0 12px rgba(255, 72, 0, 0.3);
  border-bottom: 1px solid rgba(255, 72, 0, 0.35);
  padding-bottom: 0.6rem;
  margin-bottom: 1.25rem;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
