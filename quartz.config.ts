import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const args = process.argv.slice(2)
const isServeMode = args.some((arg) => arg === "--serve" || arg === "-s")
const explicitlyEnableOgImages = process.env.QUARTZ_ENABLE_OG_IMAGES === "true"
const explicitlyDisableOgImages = process.env.QUARTZ_DISABLE_OG_IMAGES === "true"
const shouldGenerateOgImages =
  explicitlyEnableOgImages || (!isServeMode && !explicitlyDisableOgImages)

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "jmill",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "quartz.jzhao.xyz",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Space Grotesk",
        body: "Space Grotesk",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#05070d",
          lightgray: "#0d1420",
          gray: "#1b2636",
          darkgray: "#e0fbff",
          dark: "#f9fbff",
          secondary: "#00ffff",
          tertiary: "#ff4800",
          highlight: "rgba(0, 255, 255, 0.12)",
          textHighlight: "#00ffff55",
        },
        darkMode: {
          light: "#010104",
          lightgray: "#0b1422",
          gray: "#1f2e40",
          darkgray: "#e4f9ff",
          dark: "#ffffff",
          secondary: "#00ffff",
          tertiary: "#ff4800",
          highlight: "rgba(0, 255, 255, 0.12)",
          textHighlight: "#ff480055",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Only generate OG images when not running the dev server unless explicitly overridden
      ...(shouldGenerateOgImages ? [Plugin.CustomOgImages()] : []),
    ],
  },
}

export default config
