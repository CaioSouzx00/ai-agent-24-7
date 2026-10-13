import { apiClient } from '@/shared/lib/api-client'

export interface ChatResponse {
  response: string
  handoff: boolean
  paused: boolean
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatResponse> {
  return apiClient.post<ChatResponse>('/chat', {
    session_id: sessionId,
    message,
    channel: 'web',
    meta: {},
  })
}

export async function sendVoiceAudio(sessionId: string, audioBlob: Blob): Promise<{ audioBlob: Blob }> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.wav')
  formData.append('session_id', sessionId)

  const blob = await apiClient.post<Blob>('/voice/chat', formData, {
    responseType: 'blob',
  })

  return { audioBlob: blob }
}
