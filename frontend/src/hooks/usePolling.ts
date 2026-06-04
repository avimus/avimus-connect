'use client'
import { useQuery, UseQueryOptions } from '@tanstack/react-query'

interface UsePollingOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  intervalMs?: number
}

export function usePolling<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options: UsePollingOptions<T> = {}
) {
  const { intervalMs = 30000, ...rest } = options

  return useQuery<T>({
    queryKey,
    queryFn,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    ...rest,
  })
}
