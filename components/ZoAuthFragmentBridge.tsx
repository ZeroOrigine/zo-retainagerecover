'use client'

// ZO PLATFORM FIX (2026-08-19, finding #1057): Supabase implicit-flow links
// (password recovery, invites, magic links) deliver the session in the URL
// FRAGMENT (#access_token=...). A server route can never see a fragment, so
// before this bridge existed every such click died as "expired". Mounted once
// in the root layout: consumes the fragment, sets the session, strips the
// hash, and reloads so every existing session gate re-evaluates.
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ZoAuthFragmentBridge() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (!access_token || !refresh_token) return
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const supabase = createBrowserClient(url, key)
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        if (!error) window.location.reload()
      })
      .catch(() => {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      })
  }, [])
  return null
}
