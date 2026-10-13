import { apiClient } from '@/shared/lib/api-client'
import type { ToolItem, CreateDynamicToolInput } from '../schemas/tools-schemas'

export async function fetchAllTools(): Promise<ToolItem[]> {
  const [markdownText, dynamicTools] = await Promise.all([
    apiClient.get<string>('/tools', { responseType: 'text' }).catch(() => ''),
    apiClient.get<Array<{ name: string; description: string; url: string }>>('/tools/dynamic').catch(() => []),
  ])

  const dynamicMap = new Map<string, { url: string; description: string }>()
  dynamicTools.forEach((dt) => dynamicMap.set(dt.name, dt))

  const toolItems: ToolItem[] = []

  // Parse Markdown lines: - **name**: description
  const lines = markdownText.split('\n').filter((l) => l.trim().startsWith('- **'))
  lines.forEach((line) => {
    const match = line.match(/- \*\*([a-zA-Z0-9_-]+)\*\*:\s*(.*)/)
    if (match) {
      const [, name, description] = match
      const dynamicInfo = dynamicMap.get(name)
      toolItems.push({
        name,
        description,
        isDynamic: Boolean(dynamicInfo),
        url: dynamicInfo?.url,
      })
    }
  })

  // Ensure any dynamic tools not yet reflected in markdown are appended
  dynamicTools.forEach((dt) => {
    if (!toolItems.some((t) => t.name === dt.name)) {
      toolItems.push({
        name: dt.name,
        description: dt.description,
        isDynamic: true,
        url: dt.url,
      })
    }
  })

  return toolItems
}

export async function createDynamicTool(input: CreateDynamicToolInput): Promise<unknown> {
  return apiClient.post('/tools/dynamic', input)
}

export async function deleteDynamicTool(name: string): Promise<unknown> {
  return apiClient.delete(`/tools/dynamic/${name}`)
}
