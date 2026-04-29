export type Attachment = {
  id: string
  name: string
  kind: 'image' | 'text'
  mimeType: string
  size: number
  /** For text files: the full text content. For images: a small thumbnail data URL for display. */
  content?: string
}

export type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
  attachments?: Attachment[]
}

export type SkillConfig = {
  id: string
  name: string
  description: string
  placeholder: string
  promptFile: string
  knowledgeFiles?: Array<{ path: string; name: string }>
  pdfFile?: string
}

export type Conversation = {
  id: string
  skillId: string
  title: string
  summary?: string
  messages: Message[]
  modelId?: string
  createdAt: number
  updatedAt: number
}

export type ModelInfo = {
  id: string
  owned_by: string
}

export type Artefact = {
  id: string
  title: string
  language: string
  content: string
}
