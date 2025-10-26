// State persistence utilities for form data

export interface TutorialState {
  email: string
  url: string
  style: string
  voice: string
  autodetect: boolean
  cache: boolean
}

const STORAGE_KEY = 'tutorial-generator-state'

// Load state from localStorage and URL query params
export function loadState(): TutorialState {
  // Default state
  const defaultState: TutorialState = {
    email: '',
    url: '',
    style: '',
    voice: '',
    autodetect: true,
    cache: true,
  }

  let state = { ...defaultState }

  // Try localStorage first
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        state = { ...state, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e)
    }

    // URL params override localStorage
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('email')) state.email = urlParams.get('email') || ''
    if (urlParams.has('url')) state.url = urlParams.get('url') || ''
    if (urlParams.has('style')) state.style = urlParams.get('style') || ''
    if (urlParams.has('voice')) state.voice = urlParams.get('voice') || ''
    if (urlParams.has('autodetect')) state.autodetect = urlParams.get('autodetect') === '1'
    if (urlParams.has('cache')) state.cache = urlParams.get('cache') === '1'
  }

  return state
}

// Save state to localStorage and update URL
export function saveState(state: TutorialState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save to localStorage:', e)
  }

  // Update URL query params
  const params = new URLSearchParams()
  if (state.email) params.set('email', state.email)
  if (state.url) params.set('url', state.url)
  if (state.style) params.set('style', state.style)
  if (state.voice) params.set('voice', state.voice)
  params.set('autodetect', state.autodetect ? '1' : '0')
  params.set('cache', state.cache ? '1' : '0')

  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', newUrl)
}

// Validation helpers
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
