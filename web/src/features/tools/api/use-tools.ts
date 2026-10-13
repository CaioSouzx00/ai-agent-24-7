import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchAllTools, createDynamicTool, deleteDynamicTool } from './tools-api'
import type { CreateDynamicToolInput } from '../schemas/tools-schemas'

export function useTools() {
  return useQuery({
    queryKey: ['tools', 'all'],
    queryFn: fetchAllTools,
    staleTime: 5000,
  })
}

export function useToolMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tools', 'all'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateDynamicToolInput) => createDynamicTool(input),
    onSuccess: (_, variables) => {
      toast.success(`Dynamic tool "${variables.name}" registered successfully`)
      invalidate()
    },
    onError: (err: Error) => {
      toast.error(`Failed to register tool: ${err.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (name: string) => deleteDynamicTool(name),
    onSuccess: (_, name) => {
      toast.success(`Tool "${name}" removed from registry`)
      invalidate()
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete tool: ${err.message}`)
    },
  })

  return {
    createTool: createMutation,
    deleteTool: deleteMutation,
  }
}
