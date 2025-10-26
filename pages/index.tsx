'use client'

import { useState, useEffect, useRef } from 'react'
import StarfieldCanvas, { StarfieldHandle } from '@/components/StarfieldCanvas'
import Spaceship from '@/components/Spaceship'
import PlanetSection from '@/components/PlanetSection'
import Viewer, { Frame } from '@/components/Viewer'
import { loadState, saveState, validateEmail, validateUrl, TutorialState } from '@/lib/state'
import { createScrollTimeline, updateScrollProgress, getCurrentSection, getSectionProgress } from '@/lib/timeline'
import { getAudioManager } from '@/lib/audio'
import { signUp, signIn, confirmSignUp, getCurrentUser } from '@/lib/cognito'

export default function Home() {
  // State
  const [state, setState] = useState<TutorialState>({
    email: '',
    url: '',
    style: '',
    voice: '',
    autodetect: true,
    cache: true,
  })

  // Auth state
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'verify'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [scrollProgress, setScrollProgress] = useState(0)
  const [shipY, setShipY] = useState(0)
  const [shipSway, setShipSway] = useState(0)
  const [activeSection, setActiveSection] = useState<string>('intro')
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  
  // Section progression and locking
  const [unlockedSection, setUnlockedSection] = useState<string>('login')
  
  // Generation flow
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [showViewer, setShowViewer] = useState(false)
  const [currentGeneratingWord, setCurrentGeneratingWord] = useState('Images')
  const [audioMuted, setAudioMuted] = useState(false)

  // Refs
  const starfieldRef = useRef<StarfieldHandle>(null)
  const timeline = useRef(createScrollTimeline())
  const mouseXRef = useRef(0)
  const audioManagerRef = useRef<ReturnType<typeof getAudioManager> | null>(null)

  // Validation
  const isEmailValid = validateEmail(state.email)
  const isUrlValid = validateUrl(state.url)
  const canGenerate = isAuthenticated && isUrlValid && state.style.trim() !== '' && state.voice.trim() !== ''

  // Initialize audio manager and start background music on first user interaction
  useEffect(() => {
    console.log('🎬 Initializing audio manager...')
    audioManagerRef.current = getAudioManager()

    // Start audio on first real user interaction (click, keydown, or touchstart)
    const startAudioOnInteraction = () => {
      console.log('🎵 User interaction detected, starting background music...')
      audioManagerRef.current?.playBackgroundMusic()
      // Remove listeners after first interaction
      document.removeEventListener('click', startAudioOnInteraction)
      document.removeEventListener('keydown', startAudioOnInteraction)
      document.removeEventListener('touchstart', startAudioOnInteraction)
    }

    document.addEventListener('click', startAudioOnInteraction)
    document.addEventListener('keydown', startAudioOnInteraction)
    document.addEventListener('touchstart', startAudioOnInteraction)

    return () => {
      document.removeEventListener('click', startAudioOnInteraction)
      document.removeEventListener('keydown', startAudioOnInteraction)
      document.removeEventListener('touchstart', startAudioOnInteraction)
      audioManagerRef.current?.cleanup()
    }
  }, [])

  // Load state on mount
  useEffect(() => {
    const loaded = loadState()
    setState(loaded)
  }, [])

  // Save state whenever it changes
  useEffect(() => {
    saveState(state)
  }, [state])

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      const progress = updateScrollProgress(
        window.scrollY,
        document.documentElement.scrollHeight,
        window.innerHeight
      )
      setScrollProgress(progress)

      const section = getCurrentSection(progress, timeline.current)
      setActiveSection(section)

      // Animate ship downward with scroll
      setShipY(progress * 200)

      // Keep stars at consistent velocity
      starfieldRef.current?.setVelocity(0.5)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Mouse movement for ship sway
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseXRef.current = (e.clientX / window.innerWidth - 0.5) * 20
      setShipSway(mouseXRef.current)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Reduced motion check
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches && starfieldRef.current) {
      starfieldRef.current.setVelocity(0.1)
    }
  }, [])

  // Lock scrolling when viewer is active
  useEffect(() => {
    if (showViewer) {
      // Prevent scrolling to form sections
      document.body.style.overflow = 'hidden'
      // Scroll to viewer
      setTimeout(() => {
        document.getElementById('viewer')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showViewer])

  // Slot machine word cycling during generation
  useEffect(() => {
    if (!isGenerating) return

    const words = ['Images', 'Stories', 'Transcripts', 'Audio', 'Frames', 'Slides']
    let currentIndex = 0

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % words.length
      setCurrentGeneratingWord(words[currentIndex])
    }, 2500) // Change word every 2500ms (slower for 20+ second generation)

    return () => clearInterval(interval)
  }, [isGenerating])

  // Progressive section unlocking based on completion
  useEffect(() => {
    // Determine which section should be unlocked based on form completion
    let nextUnlocked = 'login'
    
    if (isAuthenticated) {
      nextUnlocked = 'url'
    }
    if (isAuthenticated && isUrlValid) {
      nextUnlocked = 'style'
    }
    if (isAuthenticated && isUrlValid && state.style.trim() && state.voice.trim()) {
      nextUnlocked = 'advanced'
    }
    if (isAuthenticated && isUrlValid && state.style.trim() && state.voice.trim()) {
      nextUnlocked = 'gate'
    }
    
    setUnlockedSection(nextUnlocked)
  }, [isAuthenticated, state.url, state.style, state.voice, isUrlValid])

  // Handle Enter key on Advanced section to go to Generate page
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && activeSection === 'advanced' && !isGenerating) {
        e.preventDefault()
        const gateSection = document.getElementById('gate')
        if (gateSection) {
          gateSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [activeSection, isGenerating])

  // Lock scroll during hyperspace generation AND when viewing content
  useEffect(() => {
    if (isGenerating || showViewer) {
      // Save current scroll position
      const scrollY = window.scrollY
      // Lock scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      // Unlock scroll
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      // Restore scroll position
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
  }, [isGenerating, showViewer])

  // Update state helper
  const updateState = (updates: Partial<TutorialState>) => {
    const newState = { ...state, ...updates }
    setState(newState)
    saveState(newState)
  }

  // Section locking logic
  const isSectionLocked = (sectionId: string) => {
    const order = ['intro', 'login', 'url', 'style', 'advanced', 'gate']
    const currentIndex = order.indexOf(unlockedSection)
    const targetIndex = order.indexOf(sectionId)
    return targetIndex > currentIndex
  }

  // Reset session handler
  const handleReset = () => {
    setShowViewer(false)
    setFrames([])
    setSessionId(null)
    setIsGenerating(false)
    setState({
      email: '',
      url: '',
      style: '',
      voice: '',
      autodetect: true,
      cache: true,
    })
    setUnlockedSection('login')
    setIsAuthenticated(false)
    setAuthMode('signin')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setVerificationCode('')
    setAuthError(null)
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle mute toggle
  const toggleMute = () => {
    const newMuted = !audioMuted
    setAudioMuted(newMuted)
    audioManagerRef.current?.setMuted(newMuted)
  }

  // Generate tutorial
  const handleGenerate = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setGenerationStep(0)

    // Track start time for minimum 20 second display
    const startTime = Date.now()
    const MINIMUM_GENERATION_TIME = 20000 // 20 seconds

    // Progressive hyperspace acceleration control
    let hyperspaceActive = true

    try {
      // CRITICAL: Stop background music immediately and start hyperspace audio
      console.log('🎵 Stopping background music and starting hyperspace...')
      audioManagerRef.current?.stopBackgroundMusic()
      
      // Check for reduced motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!prefersReducedMotion) {
        // Start hyperspace audio
        audioManagerRef.current?.playHyperspace()
        
        // Start hyperspace immediately
        starfieldRef.current?.setMode('streaks')
        
        // Progressive acceleration and brightness loop
        const accelerate = async () => {
          let velocity = 1
          let brightness = 1.0
          const maxVelocity = 30
          const maxBrightness = 12.0
          const accelerationRate = 0.5
          const brightnessRate = 0.2
          
          while (hyperspaceActive && (velocity < maxVelocity || brightness < maxBrightness)) {
            starfieldRef.current?.setVelocity(Math.min(velocity, maxVelocity))
            starfieldRef.current?.setBrightness(Math.min(brightness, maxBrightness))
            velocity += accelerationRate
            brightness += brightnessRate
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
          // Maintain max velocity and brightness
          while (hyperspaceActive) {
            starfieldRef.current?.setVelocity(maxVelocity)
            starfieldRef.current?.setBrightness(maxBrightness)
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        // Start acceleration in background
        accelerate()
        
        // Brief delay before starting API calls
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Step 1: Create tutorial
      setGenerationStep(0)
      const tutorialRes = await fetch('/api/tutorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: state.url,
          style: state.style,
          voice: state.voice,
          autodetect: state.autodetect,
          cache: state.cache,
        }),
      })

      if (!tutorialRes.ok) throw new Error('Failed to create tutorial')
      const tutorialData = await tutorialRes.json()
      setSessionId(tutorialData.sessionId)

      // Step 2: Generate images
      setGenerationStep(1)
      const imageRes = await fetch('/api/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: tutorialData.sessionId }),
      })

      if (!imageRes.ok) throw new Error('Failed to generate images')
      await imageRes.json()

      // Step 3: Generate audio
      setGenerationStep(2)
      const audioRes = await fetch('/api/audio-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: tutorialData.sessionId }),
      })

      if (!audioRes.ok) throw new Error('Failed to generate audio')
      await audioRes.json()

      // Fetch complete tutorial
      const finalRes = await fetch(`/api/tutorial?sessionId=${tutorialData.sessionId}`)
      if (!finalRes.ok) throw new Error('Failed to fetch tutorial')
      const finalData = await finalRes.json()

      // Transform frames to match Viewer expectations (text field from narration)
      const transformedFrames = finalData.frames.map((frame: any) => ({
        imageUrl: frame.imageUrl || '',
        text: frame.narration || frame.text || '',
        audioUrl: frame.audioUrl
      }))

      console.log('Transformed frames for viewer:', transformedFrames)
      setFrames(transformedFrames)

      // Ensure minimum 20 seconds have elapsed
      const elapsedTime = Date.now() - startTime
      const remainingTime = MINIMUM_GENERATION_TIME - elapsedTime
      
      if (remainingTime > 0) {
        // Wait for the remaining time to reach 20 seconds
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }

      // Stop hyperspace acceleration
      hyperspaceActive = false

      // Stop hyperspace audio with fade
      audioManagerRef.current?.stopHyperspace()

      // Transition to viewer
      if (!prefersReducedMotion) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setShowViewer(true)
      setIsGenerating(false)

      // Note: Background music stays OFF when viewing generated content

      // Reset starfield
      starfieldRef.current?.setMode('dots')
      starfieldRef.current?.setVelocity(0.5)
      starfieldRef.current?.setBrightness(1.0)

      // No scrolling - viewer will appear in place, scroll remains locked

    } catch (error) {
      console.error('Generation failed:', error)
      hyperspaceActive = false
      setIsGenerating(false)
      
      // Stop hyperspace audio and restart background music (only on error)
      audioManagerRef.current?.stopHyperspace()
      audioManagerRef.current?.playBackgroundMusic()
      
      starfieldRef.current?.setMode('dots')
      starfieldRef.current?.setVelocity(0.5)
      starfieldRef.current?.setBrightness(1.0)
      alert('Failed to generate tutorial. Please try again.')
    }
  }

  // Auth handlers with AWS Cognito
  const handleSignUp = async () => {
    setAuthError(null)
    
    // Validation
    if (!username.trim() || !state.email.trim() || !password.trim()) {
      setAuthError('All fields are required')
      return
    }
    
    if (!validateEmail(state.email)) {
      setAuthError('Invalid email address')
      return
    }
    
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    
    try {
      // AWS Cognito Sign Up
      await signUp({
        email: state.email,
        password: password,
        username: username,
      })
      
      console.log('Sign up successful', { username, email: state.email })
      setAuthMode('verify')
      setAuthError(null)
    } catch (error: any) {
      setAuthError(error.message || 'Sign up failed')
    }
  }

  const handleVerifyCode = async () => {
    setAuthError(null)
    
    if (!verificationCode.trim()) {
      setAuthError('Verification code is required')
      return
    }
    
    try {
      // AWS Cognito Confirm Sign Up
      await confirmSignUp(username, verificationCode)
      
      console.log('Verification successful', { email: state.email, code: verificationCode })
      setAuthMode('signin')
      setAuthError(null)
      alert('Account verified! Please sign in.')
    } catch (error: any) {
      setAuthError(error.message || 'Verification failed')
    }
  }

  const handleSignIn = async () => {
    setAuthError(null)
    
    if (!state.email.trim() || !password.trim()) {
      setAuthError('Email and password are required')
      return
    }
    
    if (!validateEmail(state.email)) {
      setAuthError('Invalid email address')
      return
    }
    
    try {
      // AWS Cognito Sign In
      await signIn({ email: state.email, password: password })
      
      console.log('Sign in successful', { email: state.email })
      setIsAuthenticated(true)
      setAuthError(null)
      
      // Scroll to next section
      setTimeout(() => {
        const urlSection = document.getElementById('url')
        if (urlSection) {
          urlSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 500)
    } catch (error: any) {
      setAuthError(error.message || 'Sign in failed')
    }
  }

  // Dropdown options - grouped by similarity
  const styleOptions = [
    'Explain Like I\'m 5',
    'College Frat Brother',
    'Adult Professional',
    'Pizza Restaurant Analogy',
    'Car Analogy',
  ]

  const voiceOptions = [
    'Default Male',
    'Default Female',
    'Darth Vader',
    'Spongebob Squarepants',
    'Minnie Mouse',
    'Jake Paul',
    'Kim Kardashian',
  ]

  return (
    <>
      {/* Audio Mute Toggle Button - Hidden when viewer is active */}
      {!showViewer && (
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={toggleMute}
            className="rounded-full border border-white/20 bg-black/60 p-3 backdrop-blur transition-all hover:border-white/40 hover:bg-black/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-label={audioMuted ? 'Unmute audio' : 'Mute audio'}
            title={audioMuted ? 'Unmute audio' : 'Mute audio'}
          >
          {audioMuted ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            )}
          </button>
        </div>
      )}

      {/* Fixed scene layer */}
      <div id="scene" className="fixed inset-0 w-full h-full overflow-hidden" style={{ zIndex: 0 }}>
        <StarfieldCanvas ref={starfieldRef} />

        {/* Readability overlay (subtle vignette/darkening) - hidden during hyperspace */}
        {!isGenerating && (
          <div
            className="pointer-events-none absolute inset-0 w-full h-full transition-opacity duration-1000"
            style={{
              zIndex: 1,
              background:
                'radial-gradient(circle at 50% 32%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.75) 80%, rgba(0,0,0,0.85) 100%)',
            }}
          />
        )}
        {!isGenerating && (
          <Spaceship y={shipY} xSway={shipSway} glow={activeSection === 'gate'} />
        )}
        
        {/* Optional nebula background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url(/assets/bg/nebula.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            zIndex: -1,
          }}
        />
      </div>

      {/* Scrollable content */}
      <main className="relative z-10 w-screen overflow-x-hidden" style={{ maxWidth: '100%' }}>
        
        {/* Intro Section */}
        <section id="intro" className="min-h-screen flex items-center justify-center px-6">
          <div className="flex flex-col items-center justify-center" style={{ marginTop: '8vh' }}>
            <div className="flex justify-center mb-3">
              <img
                src="/assets/homelogo.svg"
                alt="Skywalker Logo"
                className="w-full max-w-2xl h-auto drop-shadow-[0_4px_30px_rgba(233,203,1,0.5)]"
              />
            </div>
            <p
              className="text-xl md:text-2xl font-light tracking-[0.15em] capitalize mb-12"
              style={{
                color: '#e9cb01',
                fontFamily: 'SF Distant Galaxy, SF Distant Galaxy Alt, sans-serif',
                letterSpacing: '0.2em'
              }}
            >
              Your Solution To Visualizing Everything
            </p>
            <div>
              <button
                onClick={() => {
                  document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="cursor-pointer focus:outline-none focus:ring-2 rounded-full p-2"
                style={{
                  '--tw-ring-color': '#e9cb01'
                } as React.CSSProperties}
                aria-label="Scroll to first planet"
              >
                <svg
                  className="w-8 h-8 mx-auto animate-bounce"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#e9cb01"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Login/Auth Section */}
        <PlanetSection
          id="login"
          title="Planet: Authentication"
          helper={authMode === 'verify' ? 'Verify your account' : isAuthenticated ? 'Welcome back!' : 'Sign in or create an account'}
          side="left"
          assetPath="/assets/planets/planet-login.svg"
          isActive={activeSection === 'login'}
          isLocked={false}
        >
          <div className="space-y-6 min-h-[400px]">
            {/* Auth Mode Tabs - Only show if not in verify mode */}
            {authMode !== 'verify' && !isAuthenticated && (
              <div className="relative flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                {/* Sliding indicator background */}
                <div 
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-sky-400 rounded-lg transition-all duration-300 ease-in-out"
                  style={{
                    transform: authMode === 'signin' ? 'translateX(0)' : 'translateX(calc(100% + 8px))'
                  }}
                />
                
                <button
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 relative z-10 ${
                    authMode === 'signin'
                      ? 'text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 relative z-10 ${
                    authMode === 'signup'
                      ? 'text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error Message */}
            {authError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {authError}
              </div>
            )}

            {/* Sign In Form */}
            {authMode === 'signin' && !isAuthenticated && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-wider text-white/70">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={state.email}
                    onChange={(e) => updateState({ email: e.target.value })}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors"
                    placeholder="pilot@space.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-wider text-white/70">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && state.email.trim() && password.trim()) {
                        e.preventDefault()
                        handleSignIn()
                      }
                    }}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  onClick={handleSignIn}
                  className="w-full mt-4 rounded-xl border border-white/10 bg-black px-6 py-3 text-base font-semibold backdrop-blur transition-all hover:border-sky-400/50 hover:bg-sky-400/10 hover:shadow-lg hover:shadow-sky-400/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Sign Up Form */}
            {authMode === 'signup' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-wider text-white/70">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput(null)}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors"
                    placeholder="spacepilot"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-wider text-white/70">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={state.email}
                    onChange={(e) => updateState({ email: e.target.value })}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors"
                    placeholder="pilot@space.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-wider text-white/70">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors"
                    placeholder="Min. 8 characters"
                  />
                  <p className="text-xs text-white/60">
                    Password must be at least 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-wider text-white/70">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedInput('confirmPassword')}
                    onBlur={() => setFocusedInput(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && username.trim() && state.email.trim() && password.trim() && confirmPassword.trim()) {
                        e.preventDefault()
                        handleSignUp()
                      }
                    }}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  onClick={handleSignUp}
                  className="w-full mt-4 rounded-xl border border-white/10 bg-black px-6 py-3 text-base font-semibold backdrop-blur transition-all hover:border-sky-400/50 hover:bg-sky-400/10 hover:shadow-lg hover:shadow-sky-400/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Verification Form */}
            {authMode === 'verify' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-sky-400/10 border border-sky-400/30 px-4 py-3 text-sm text-sky-300">
                  A verification code has been sent to <strong>{state.email}</strong>
                </div>

                <div className="space-y-2">
                  <label className="text-sm uppercase tracking-wider text-white/70">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    onFocus={() => setFocusedInput('verificationCode')}
                    onBlur={() => setFocusedInput(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && verificationCode.trim()) {
                        e.preventDefault()
                        handleVerifyCode()
                      }
                    }}
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors text-center text-2xl tracking-widest"
                    placeholder="123456"
                    maxLength={6}
                  />
                  <p className="text-xs text-white/60 text-center">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                <button
                  onClick={handleVerifyCode}
                  className="w-full mt-4 rounded-xl border border-white/10 bg-black px-6 py-3 text-base font-semibold backdrop-blur transition-all hover:border-sky-400/50 hover:bg-sky-400/10 hover:shadow-lg hover:shadow-sky-400/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  Verify Account
                </button>

                <button
                  onClick={() => setAuthMode('signin')}
                  className="w-full text-sm text-white/60 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Authenticated State */}
            {isAuthenticated && (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Signed in as <strong>{state.email}</strong></span>
                </div>
                
                <p className="text-xs text-white/60 text-center">
                  Continue to the next section to start your tutorial
                </p>
              </div>
            )}
          </div>
        </PlanetSection>

        {/* URL Section */}
        <PlanetSection
          id="url"
          title="Planet: Source URL"
          helper="What would you like to learn about?"
          side="right"
          assetPath="/assets/planets/planet-url.svg"
          isActive={activeSection === 'url'}
          isLocked={isSectionLocked('url')}
        >
          <div className="space-y-4">
            <label className="text-sm uppercase tracking-wider text-white/70">
              GitHub Repository or Website
            </label>
            <input
              type="url"
              value={state.url}
              onChange={(e) => updateState({ url: e.target.value })}
              onFocus={() => setFocusedInput('url')}
              onBlur={() => setFocusedInput(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isUrlValid) {
                  e.preventDefault()
                  e.stopPropagation()
                  const styleSection = document.getElementById('style')
                  if (styleSection) {
                    styleSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    setTimeout(() => {
                      const styleInput = document.querySelector('#style input[type="text"]') as HTMLInputElement
                      styleInput?.focus()
                    }, 500)
                  }
                }
              }}
              className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors"
              placeholder="https://github.com/user/repo or https://example.com"
            />
            {state.url && !isUrlValid && (
              <p className="text-xs text-red-400">Please enter a valid URL</p>
            )}
            <p className="text-xs text-white/60">
              Paste a GitHub repository or website URL.
            </p>
          </div>
        </PlanetSection>

        {/* Style Section */}
        <PlanetSection
          id="style"
          title="Planet: Narrative Style"
          helper="Choose how you want your tutorial explained"
          side="left"
          assetPath="/assets/planets/planet-style.svg"
          isActive={activeSection === 'style'}
          isLocked={isSectionLocked('style')}
        >
          <div className="space-y-6">
            {/* Explanation Style Dropdown */}
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider text-white/70">
                Explanation Style
              </label>
              <select
                value={state.style}
                onChange={(e) => updateState({ style: e.target.value })}
                onFocus={() => setFocusedInput('style')}
                onBlur={() => setFocusedInput(null)}
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors cursor-pointer"
              >
                <option value="" disabled>Select explanation style...</option>
                {styleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/60">
                Each style uses different analogies and terminology.
              </p>
            </div>

            {/* Voice Dropdown */}
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider text-white/70">
                Narrator Voice
              </label>
              <select
                value={state.voice}
                onChange={(e) => updateState({ voice: e.target.value })}
                onFocus={() => setFocusedInput('voice')}
                onBlur={() => setFocusedInput(null)}
                className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 outline-none ring-0 focus:border-sky-400 transition-colors cursor-pointer"
              >
                <option value="" disabled>Select narrator voice...</option>
                {voiceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/60">
                Choose the voice that will narrate your tutorial.
              </p>
            </div>

            {/* Next Button */}
            <div className="pt-4">
              <button
                onClick={() => {
                  const advancedSection = document.getElementById('advanced')
                  if (advancedSection) {
                    advancedSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-black px-6 py-3 text-base font-semibold backdrop-blur transition-all hover:border-sky-400/50 hover:bg-sky-400/10 hover:shadow-lg hover:shadow-sky-400/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                Next →
              </button>
            </div>
          </div>
        </PlanetSection>

        {/* Advanced Section */}
        <PlanetSection
          id="advanced"
          title="Planet: Advanced"
          helper="Fine-tune your tutorial generation"
          side="right"
          assetPath="/assets/planets/planet-advanced.svg"
          isActive={activeSection === 'advanced'}
          isLocked={isSectionLocked('advanced')}
        >
          <div className="space-y-6">
            
            {/* Auto-detect toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Auto-detect domain</label>
                <p className="text-xs text-white/60 mt-1">
                  Automatically identify the project type
                </p>
              </div>
              <button
                onClick={() => updateState({ autodetect: !state.autodetect })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  state.autodetect ? 'bg-sky-400' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state.autodetect ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Cache toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Use cache</label>
                <p className="text-xs text-white/60 mt-1">
                  Speed up generation for previously analyzed sources
                </p>
              </div>
              <button
                onClick={() => updateState({ cache: !state.cache })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  state.cache ? 'bg-sky-400' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    state.cache ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Next Button */}
            <div className="pt-4">
              <button
                onClick={() => {
                  const gateSection = document.getElementById('gate')
                  if (gateSection) {
                    gateSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-black px-6 py-3 text-base font-semibold backdrop-blur transition-all hover:border-sky-400/50 hover:bg-sky-400/10 hover:shadow-lg hover:shadow-sky-400/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                Next →
              </button>
            </div>
          </div>
        </PlanetSection>

        {/* Gate Section */}
        <section id="gate" className={`relative min-h-screen flex items-center justify-center px-6 transition-opacity duration-300 ${
          isGenerating ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <div className="text-center space-y-8 flex flex-col items-center">
            <div className="relative inline-block ml-5">
              <img
                src="/assets/planets/planet-gate.svg"
                alt="Jump Gate"
                className={`w-80 h-80 object-contain ${
                  isSectionLocked('gate') 
                    ? 'opacity-30 grayscale' 
                    : ''
                } ${!isSectionLocked('gate') ? 'animate-float' : ''}`}
              />
              {!isSectionLocked('gate') && (
                <div className="absolute inset-0 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl -z-10 animate-pulse-glow" />
              )}
            </div>

            <div className="space-y-4">
              <h2 className={`text-3xl font-semibold ${
                isSectionLocked('gate') ? 'opacity-50' : 'opacity-100'
              }`}>
                {isSectionLocked('gate') ? 'Complete Previous Sections' : 'Ready for Hyperspace?'}
              </h2>
              <p className={`text-white/70 max-w-md mx-auto transition-opacity duration-500 ${
                isGenerating ? 'opacity-0' : isSectionLocked('gate') ? 'opacity-50' : 'opacity-100'
              }`}>
                {isSectionLocked('gate') 
                  ? 'Fill in all required fields above to unlock hyperspace jump.'
                  : 'Your tutorial parameters are set. Engage the jump drive to begin generation.'}
              </p>
              
              {!isGenerating && !isSectionLocked('gate') && (
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="mt-6 rounded-xl border border-sky-400 bg-sky-400/10 px-8 py-4 text-lg font-semibold backdrop-blur transition-all hover:bg-sky-400/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  Generate Tutorial
                </button>
              )}

              {!canGenerate && !isSectionLocked('gate') && (
                <p className="text-sm text-red-400 mt-4">
                  Please complete all required fields above
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Viewer Section - Full screen overlay */}
        {showViewer && frames.length > 0 && sessionId && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-black">
            <Viewer frames={frames} sessionId={sessionId} onReset={handleReset} />
          </div>
        )}
      </main>

      {/* Spaceship Cockpit Overlay - Appears instantly */}
      {isGenerating && (
        <div className="fixed inset-0 pointer-events-none animate-[fadeIn_0.15s_ease-out]"
             style={{
               zIndex: 40
             }}>
          {/* Spaceship cockpit image - 100% fit with cover */}
          <img
            src="/assets/spaceship-cockpit.png"
            alt="Cockpit"
            className="w-full h-full object-cover"
          />

          {/* GENERATING text - manually position this */}
          <h2 className="absolute top-[28%] left-1/2 -translate-x-1/2 text-5xl font-bold text-white tracking-wider font-share-tech">
            GENERATING
          </h2>

          {/* Animated word - manually position this */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 h-16 flex items-center justify-center">
            <div
              key={currentGeneratingWord}
              className="text-5xl font-bold text-white tracking-wider font-share-tech animate-word-fade"
            >
              {currentGeneratingWord.toUpperCase()}
            </div>
          </div>

          {/* Status Indicators - manually position this */}
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 flex justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-share-tech text-green-400">PROC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-share-tech text-yellow-400">AI-GEN</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-share-tech text-cyan-400">SYNC</span>
            </div>
          </div>

        </div>
      )}

    </>
  )
}
