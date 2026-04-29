import type { Attachment } from './types'

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'csv', 'json', 'yaml', 'yml', 'xml', 'toml',
  'html', 'css', 'scss', 'less',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'c', 'cpp', 'h', 'hpp', 'cs',
  'php', 'sh', 'bash', 'zsh', 'fish',
  'sql', 'graphql', 'gql',
  'env', 'ini', 'cfg', 'conf', 'config',
  'dockerfile', 'makefile',
  'log', 'diff', 'patch',
])

const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20 MB — practical browser memory limit
const THUMBNAIL_MAX_DIM = 200

function getExtension(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type)
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  if (file.type === 'application/json') return true
  if (file.type === 'application/xml') return true
  if (file.type === 'application/pdf') return true // we'll extract text
  return TEXT_EXTENSIONS.has(getExtension(file.name))
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/** Create a small thumbnail data URL from an image file */
async function createThumbnail(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(THUMBNAIL_MAX_DIM / img.width, THUMBNAIL_MAX_DIM / img.height, 1)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(dataUrl) // fallback to full
    img.src = dataUrl
  })
}

export type ProcessedFile = {
  attachment: Attachment
  /** Full base64 data URL for images (not persisted — only used at send time) */
  fullDataUrl?: string
}

export async function processFile(file: File): Promise<ProcessedFile> {
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (isImageFile(file)) {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image "${file.name}" exceeds 10 MB limit`)
    }
    const [fullDataUrl, thumbnail] = await Promise.all([
      readAsDataURL(file),
      createThumbnail(file),
    ])
    return {
      attachment: {
        id,
        name: file.name,
        kind: 'image',
        mimeType: file.type,
        size: file.size,
        content: thumbnail,
      },
      fullDataUrl,
    }
  }

  if (isTextFile(file)) {

    let text: string

    if (file.type === 'application/pdf') {
      // Basic PDF text extraction — read raw bytes and extract text runs
      // For proper PDF parsing, a library like pdf.js would be needed.
      // For now, read as text which works for text-based PDFs.
      const buffer = await readAsArrayBuffer(file)
      const bytes = new Uint8Array(buffer)
      const decoder = new TextDecoder('utf-8', { fatal: false })
      text = decoder.decode(bytes)
      // Strip binary noise — keep only printable ASCII + common unicode
      text = text.replace(/[^\x20-\x7E\n\r\t -￿]/g, ' ').replace(/\s{3,}/g, '\n')
      if (text.trim().length < 50) {
        text = `[PDF file: ${file.name} — content could not be extracted as text. The file may contain scanned images or complex formatting.]`
      }
    } else {
      text = await readAsText(file)
    }

    return {
      attachment: {
        id,
        name: file.name,
        kind: 'text',
        mimeType: file.type || 'text/plain',
        size: file.size,
        content: text,
      },
    }
  }

  throw new Error(`Unsupported file type: ${file.name}`)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export { isImageFile, isTextFile }
