import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sourceDir = "/Users/jmill/Documents/obsidian/nhx4b"
const attachmentsDir = path.join(sourceDir, "nobody/attachments")
const destDir = path.join(__dirname, "../content")

const availableLinkTargets = new Set<string>()
const availableLinkTargetsLower = new Set<string>()

function trackLinkTarget(value: string) {
  if (!value) return
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "")
  const normalizedLower = normalized.toLowerCase()
  availableLinkTargets.add(normalized)
  availableLinkTargetsLower.add(normalizedLower)
}

function isKnownLinkTarget(target: string): boolean {
  const normalized = target.replace(/\\/g, "/").replace(/^\.\//, "")
  const basename = path.posix.basename(normalized)
  const normalizedLower = normalized.toLowerCase()
  const basenameLower = basename.toLowerCase()
  return (
    availableLinkTargets.has(normalized) ||
    availableLinkTargets.has(basename) ||
    availableLinkTargetsLower.has(normalizedLower) ||
    availableLinkTargetsLower.has(basenameLower)
  )
}

function scrubDeadLinksFromContent(content: string): string {
  const wikiLinkRegex = /(!)?\[\[([^[\]]+)\]\]/g
  return content.replace(wikiLinkRegex, (match, embedPrefix, inner) => {
    if (embedPrefix) {
      return match
    }

    const [targetRaw, aliasRaw] = inner.split("|")
    const displayText = aliasRaw?.trim() ?? targetRaw.trim()
    const [noteTargetRaw] = targetRaw.split("#")
    const noteTarget = noteTargetRaw.replace(/\.md$/i, "").trim()

    if (!noteTarget) {
      return match
    }

    // Skip media embeds or attachments that rely on file extensions
    const ext = path.extname(noteTargetRaw)
    if (ext && ext.toLowerCase() !== ".md") {
      return match
    }

    if (isKnownLinkTarget(noteTarget)) {
      return match
    }

    return displayText || match
  })
}

function scrubDeadLinksInDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scrubDeadLinksInDir(fullPath)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const originalContent = fs.readFileSync(fullPath, "utf8")
      const cleanedContent = scrubDeadLinksFromContent(originalContent)
      if (cleanedContent !== originalContent) {
        fs.writeFileSync(fullPath, cleanedContent)
        console.log(`Removed dead links in: ${fullPath}`)
      }
    }
  }
}

function registerLinkTarget(destPath: string) {
  const relativePath = path.relative(destDir, destPath).replace(/\\/g, "/")
  const withoutExt = relativePath.replace(/\.md$/i, "")
  trackLinkTarget(withoutExt)
  trackLinkTarget(path.posix.basename(withoutExt))
}

function registerFolderTarget(dirPath: string) {
  const relativePath = path.relative(destDir, dirPath).replace(/\\/g, "/")
  const normalized = relativePath.replace(/\/+$/g, "")
  if (normalized.length === 0) {
    return
  }
  trackLinkTarget(normalized)
  trackLinkTarget(path.posix.basename(normalized))
}

function populateLinkTargets(dir: string) {
  availableLinkTargets.clear()
  availableLinkTargetsLower.clear()

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        registerFolderTarget(fullPath)
        walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        registerLinkTarget(fullPath)
      }
    }
  }

  walk(dir)
}

function copyAttachment(content: string, sourceDir: string, destDir: string): string {
  const regex = /!\[\[([^[\]]+)\]\]/g
  const attachmentsOutputDir = path.join(destDir, "attachments")
  fs.mkdirSync(attachmentsOutputDir, { recursive: true })

  return content.replace(regex, (match, inner) => {
    const parts = inner.split("|")
    const targetRaw = (parts[0] ?? "").trim()
    const suffix = parts.length > 1 ? `|${parts.slice(1).join("|")}` : ""

    if (!targetRaw) {
      return match
    }

    const ext = path.extname(targetRaw).toLowerCase()
    if (!ext || ext === ".md") {
      // Not an attachment; keep original match
      return match
    }

    const normalizedTarget = targetRaw.replace(/^\.?\//, "")
    const needsPrefix = !normalizedTarget.includes("/")
    const fileName = path.basename(normalizedTarget)
    const sourcePath = path.join(attachmentsDir, fileName)
    const destPath = path.join(attachmentsOutputDir, fileName)

    if (fs.existsSync(sourcePath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.copyFileSync(sourcePath, destPath)
      console.log(`Copied attachment: ${sourcePath} to ${destPath}`)
    } else {
      console.warn(`Attachment not found: ${sourcePath}`)
    }

    const linkTarget = needsPrefix ? `attachments/${fileName}` : normalizedTarget
    return `![[${linkTarget}${suffix}]]`
  })
}

function copyPublishedFiles(dir: string) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      copyPublishedFiles(fullPath)
    } else if (path.extname(file) === ".md") {
      let content = fs.readFileSync(fullPath, "utf8")
      if (content.includes('publish: "true"') || content.includes("publish: true")) {
        // Remove emoji and space from the start of the filename
        let destFileName = file.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)+/gu, "")

        // Determine destination folder based on parent directory name
        const parentFolderName = path.basename(path.dirname(fullPath))
        const parentDestDir = path.join(destDir, parentFolderName)
        const targetDir =
          destFileName.toLowerCase() === "index.md" ? destDir : parentDestDir
        const destPath = path.join(targetDir, destFileName)

        // Remove H1 level headings (lines starting with a single #)
        let modifiedContent = content
          .split("\n")
          .filter((line) => !line.trim().match(/^#\s/))
          .join("\n")

        // Copy attachments and update links
        modifiedContent = copyAttachment(modifiedContent, sourceDir, destDir)

        fs.mkdirSync(targetDir, { recursive: true })
        fs.writeFileSync(destPath, modifiedContent)
        console.log(`Copied and modified: ${fullPath} to ${destPath}`)
      }
    }
  }
}

// Ensure the destination directory exists
fs.mkdirSync(destDir, { recursive: true })

// Ensure there's at least a placeholder index page for Quartz
const placeholderIndexPath = path.join(destDir, "index.md")
if (!fs.existsSync(placeholderIndexPath)) {
  const placeholderContent = `---
title: "Home"
---

This is a temporary home page. Replace this file with your own content when ready.
`
  fs.writeFileSync(placeholderIndexPath, placeholderContent)
  console.log(`Created placeholder index: ${placeholderIndexPath}`)
}

// Start the recursive search and copy process
copyPublishedFiles(sourceDir)
populateLinkTargets(destDir)
scrubDeadLinksInDir(destDir)

console.log("Finished copying and modifying published files.")
