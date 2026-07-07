import fs from "fs"
import path from "path"
import sharp from "sharp"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sourceDir = "/Users/jmill/sdj/nhx4b"
const attachmentsDir = path.join(sourceDir, "nobody/attachments")
const destDir = path.join(__dirname, "../content")
const convertibleImageExtensions = new Set([".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"])
const processedAttachments = new Set<string>()

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
  const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---(?:\n|$)/)
  if (frontmatterMatch) {
    return `${frontmatterMatch[0]}${scrubDeadLinksFromMarkdown(content.slice(frontmatterMatch[0].length))}`
  }

  return scrubDeadLinksFromMarkdown(content)
}

function scrubDeadLinksFromMarkdown(content: string): string {
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

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getPublishedAttachmentFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  if (!convertibleImageExtensions.has(ext)) {
    return fileName
  }

  const parsed = path.parse(fileName)
  return `${parsed.name}.webp`
}

async function writeAttachment(sourcePath: string, destPath: string, sourceExt: string) {
  const attachmentKey = `${sourcePath}\0${destPath}`
  if (processedAttachments.has(attachmentKey)) {
    return
  }

  processedAttachments.add(attachmentKey)
  fs.mkdirSync(path.dirname(destPath), { recursive: true })

  if (!convertibleImageExtensions.has(sourceExt)) {
    fs.copyFileSync(sourcePath, destPath)
    console.log(`Copied attachment: ${sourcePath} to ${destPath}`)
    return
  }

  const inputSize = fs.statSync(sourcePath).size
  await sharp(sourcePath)
    .rotate()
    .webp({
      effort: 4,
      quality: 82,
      smartSubsample: true,
    })
    .toFile(destPath)

  const outputSize = fs.statSync(destPath).size
  console.log(
    `Compressed attachment: ${sourcePath} to ${destPath} (${formatBytes(inputSize)} -> ${formatBytes(
      outputSize,
    )})`,
  )
}

async function copyAttachment(content: string, destDir: string): Promise<string> {
  const regex = /!\[\[([^[\]]+)\]\]/g
  const attachmentsOutputDir = path.join(destDir, "attachments")
  fs.mkdirSync(attachmentsOutputDir, { recursive: true })

  let result = ""
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    result += content.slice(lastIndex, match.index)

    const fullMatch = match[0]
    const inner = match[1]
    const parts = inner.split("|")
    const targetRaw = (parts[0] ?? "").trim()
    const suffix = parts.length > 1 ? `|${parts.slice(1).join("|")}` : ""

    if (!targetRaw) {
      result += fullMatch
      lastIndex = match.index + fullMatch.length
      continue
    }

    const ext = path.extname(targetRaw).toLowerCase()
    if (!ext || ext === ".md") {
      // Not an attachment; keep original match
      result += fullMatch
      lastIndex = match.index + fullMatch.length
      continue
    }

    const normalizedTarget = targetRaw.replace(/^\.?\//, "")
    const fileName = path.basename(normalizedTarget)
    const sourcePath = path.join(attachmentsDir, fileName)
    const publishedFileName = getPublishedAttachmentFileName(fileName)
    const destPath = path.join(attachmentsOutputDir, publishedFileName)

    if (fs.existsSync(sourcePath)) {
      await writeAttachment(sourcePath, destPath, ext)
    } else {
      console.warn(`Attachment not found: ${sourcePath}`)
    }

    const linkTarget = `attachments/${publishedFileName}`
    result += `![[${linkTarget}${suffix}]]`
    lastIndex = match.index + fullMatch.length
  }

  return result + content.slice(lastIndex)
}

async function copyPublishedFiles(dir: string) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      await copyPublishedFiles(fullPath)
    } else if (path.extname(file) === ".md") {
      let content = fs.readFileSync(fullPath, "utf8")
      if (content.includes('publish: "true"') || content.includes("publish: true")) {
        // Remove emoji and space from the start of the filename
        let destFileName = file.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)+/gu, "")

        // Determine destination folder based on parent directory name
        const parentFolderName = path.basename(path.dirname(fullPath))
        const parentDestDir = path.join(destDir, parentFolderName)
        const targetDir = destFileName.toLowerCase() === "index.md" ? destDir : parentDestDir
        const destPath = path.join(targetDir, destFileName)

        // Remove H1 level headings (lines starting with a single #)
        let modifiedContent = content
          .split("\n")
          .filter((line) => !line.trim().match(/^#\s/))
          .join("\n")

        // Copy attachments and update links
        modifiedContent = await copyAttachment(modifiedContent, destDir)

        fs.mkdirSync(targetDir, { recursive: true })
        fs.writeFileSync(destPath, modifiedContent)
        console.log(`Copied and modified: ${fullPath} to ${destPath}`)
      }
    }
  }
}

function resetGeneratedAttachments() {
  const attachmentsOutputDir = path.join(destDir, "attachments")
  fs.rmSync(attachmentsOutputDir, { recursive: true, force: true })
  fs.mkdirSync(attachmentsOutputDir, { recursive: true })
  processedAttachments.clear()
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
resetGeneratedAttachments()
await copyPublishedFiles(sourceDir)
populateLinkTargets(destDir)
scrubDeadLinksInDir(destDir)

console.log("Finished copying and modifying published files.")
