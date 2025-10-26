'use client'

import { useState, useRef, useEffect } from 'react'

export interface Frame {
  imageUrl: string
  text: string
  audioUrl?: string
}

interface ViewerProps {
  frames: Frame[]
  sessionId: string
  onReset?: () => void
}

export default function Viewer({ frames, sessionId, onReset }: ViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRephrasing, setIsRephrasing] = useState(false)
  const [localFrames, setLocalFrames] = useState<Frame[]>(frames)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentFrame = localFrames[currentIndex] || frames[currentIndex]

  // Debug logging
  useEffect(() => {
    console.log('Viewer received frames:', frames)
    console.log('Current frame:', currentFrame)
  }, [frames, currentFrame])

  // Handle audio play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentFrame.audioUrl) return

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, currentFrame.audioUrl])

  // Update audio source when frame changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio && currentFrame.audioUrl) {
      audio.src = currentFrame.audioUrl
      if (isPlaying) {
        audio.play().catch(() => setIsPlaying(false))
      }
    } else {
      setIsPlaying(false)
    }
  }, [currentIndex, currentFrame.audioUrl])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setIsPlaying(false)
        setCurrentIndex(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < localFrames.length - 1) {
        setIsPlaying(false)
        setCurrentIndex(prev => prev + 1)
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, localFrames.length, isPlaying])

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsPlaying(false)
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < localFrames.length - 1) {
      setIsPlaying(false)
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleRephrase = async () => {
    setIsRephrasing(true)
    try {
      const response = await fetch('/api/rephrase-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          frameIndex: currentIndex,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local frames array properly
        const updatedFrames = [...localFrames]
        updatedFrames[currentIndex] = {
          ...updatedFrames[currentIndex],
          text: data.newText,
          audioUrl: data.newAudioUrl
        }
        setLocalFrames(updatedFrames)
        setIsPlaying(false)
      }
    } catch (error) {
      console.error('Failed to rephrase:', error)
    } finally {
      setIsRephrasing(false)
    }
  }

  if (frames.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-white/60">No frames available</p>
      </div>
    )
  }

  return (
    <section
      id="viewer"
      className="fixed inset-0 w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: 'url(/assets/bg/generatedbackground.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* New Project Button - Top Right */}
      {onReset && (
        <button
          onClick={() => {
            if (window.confirm('Start a new project? This will clear your current session.')) {
              onReset()
            }
          }}
          className="fixed top-6 right-6 z-50 rounded-xl border border-white/30 bg-black/60 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:border-white hover:bg-black/80 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      )}

      <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
        {/* Main Content Container - Single Page Layout */}
        <div className="w-full max-w-6xl h-full max-h-[90vh] flex items-center gap-10">

          {/* Left Side: Image + Navigation */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4">
            {/* Square Image Container - Larger */}
            <div className="relative aspect-square w-[550px] overflow-hidden rounded-xl border border-white/20 bg-black/40 shadow-2xl">
              {currentFrame.imageUrl ? (
                <img
                  src={currentFrame.imageUrl}
                  alt={`Frame ${currentIndex + 1}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Image failed to load:', currentFrame.imageUrl)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Image generating...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Controls Below Image */}
            <div className="flex items-center justify-center gap-4">
              {/* Left Navigation Button */}
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="rounded-full border border-white bg-white/90 p-3 transition-all hover:bg-white hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
                aria-label="Previous frame"
              >
                <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Frame Counter */}
              <div className="px-6 py-2 rounded-lg bg-white/10 backdrop-blur border border-white/20">
                <span className="text-white font-medium">
                  {currentIndex + 1} / {localFrames.length}
                </span>
              </div>

              {/* Right Navigation Button */}
              <button
                onClick={handleNext}
                disabled={currentIndex === localFrames.length - 1}
                className="rounded-full border border-white bg-white/90 p-3 transition-all hover:bg-white hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
                aria-label="Next frame"
              >
                <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Side: Transcript + Controls */}
          <div className="flex-1 h-full flex flex-col justify-center">
            <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-xl p-10 shadow-2xl max-h-[700px] flex flex-col">
              {/* Transcript Header */}
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-4">
                Transcript
              </h3>

              {/* Transcript Text - Scrollable if needed */}
              <div className="flex-1 overflow-y-auto mb-6">
                {currentFrame.text ? (
                  <p className="text-white/90 text-lg leading-relaxed">
                    {currentFrame.text}
                  </p>
                ) : (
                  <p className="text-white/40 text-lg leading-relaxed italic">
                    No transcript available for this frame.
                  </p>
                )}
              </div>

              {/* Audio Controls */}
              <div className="flex items-center justify-center gap-4 pt-6 border-t border-white/20">
                {/* Play/Pause Button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!currentFrame.audioUrl}
                  className="rounded-full border border-white bg-white/90 p-4 transition-all hover:bg-white hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
                  aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Rephrase Button */}
                <button
                  onClick={handleRephrase}
                  disabled={isRephrasing}
                  className="rounded-lg border border-white/40 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition-all hover:border-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white flex items-center gap-2 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isRephrasing ? 'Rephrasing...' : 'Rephrase Caption'}
                </button>
              </div>
            </div>
          </div>

          {/* Reset Session Button - COMMENTED OUT FOR NOW */}
          {/* {onReset && (
            <div className="flex flex-col items-center gap-6 pt-16 pb-12 border-t-2 border-red-400/30 mt-16 bg-gradient-to-b from-transparent to-red-400/5">
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-white/80">
                  Finished viewing this tutorial?
                </p>
                <p className="text-sm text-white/60">
                  Click below to return to the homepage and create a new one
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset and return to homepage? This will clear your current session.')) {
                    onReset()
                  }
                }}
                className="rounded-2xl border-2 border-red-500 bg-red-500/25 px-12 py-5 text-xl font-black text-white backdrop-blur-sm transition-all hover:bg-red-500/40 hover:scale-110 hover:border-red-400 focus:outline-none focus:ring-4 focus:ring-red-500/50 shadow-2xl shadow-red-500/30 animate-pulse"
              >
                🏠 RESET & RETURN TO HOMEPAGE
              </button>
            </div>
          )} */}

          {/* Hidden audio element */}
          {currentFrame.audioUrl && (
            <audio
              ref={audioRef}
              onEnded={() => setIsPlaying(false)}
              onError={() => setIsPlaying(false)}
            />
          )}
        </div>
      </div>
    </section>
  )
}
