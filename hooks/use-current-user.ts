"use client"

import { useSession } from "next-auth/react"

export function useCurrentUser() {
  const { data: session, status, update } = useSession()

  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
    update,
  }
}
