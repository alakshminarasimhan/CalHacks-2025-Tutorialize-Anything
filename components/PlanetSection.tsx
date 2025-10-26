'use client'

import { ReactNode, useEffect, useState } from 'react'

interface PlanetSectionProps {
  id: string
  title: string
  helper?: string
  side: 'left' | 'right'
  assetPath: string
  children: ReactNode
  isActive?: boolean
  isLocked?: boolean
}

export default function PlanetSection({
  id,
  title,
  helper,
  side,
  assetPath,
  children,
  isActive = false,
  isLocked = false,
}: PlanetSectionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    const element = document.getElementById(id)
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [id])

  return (
    <section
      id={id}
      className="relative min-h-screen flex items-center justify-center px-6 py-20 w-full overflow-x-hidden"
    >
      <div className="container mx-auto max-w-6xl w-full" style={{ maxWidth: '100%' }}>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${side === 'right' ? 'md:flex-row-reverse' : ''}`}>
          
          {/* Planet image */}
          <div
            className={`flex justify-center transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
            } ${side === 'right' ? 'md:order-2' : ''}`}
            style={{
              transitionDelay: '200ms',
            }}
          >
            <div className="relative inline-block">
              <img
                src={assetPath}
                alt={title}
                className={`w-96 h-96 md:w-[28rem] md:h-[28rem] object-contain transition-all ${
                  isLocked ? 'grayscale opacity-30' : 'animate-float'
                }`}
              />
            </div>
          </div>

          {/* Form card */}
          <div
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            } ${side === 'right' ? 'md:order-1' : ''}`}
            style={{
              transitionDelay: '400ms',
            }}
          >
            <div
              className={`mx-auto w-full max-w-xl rounded-2xl border bg-black p-8 transition-all duration-300 ${
                isLocked
                  ? 'border-white/5 opacity-50 pointer-events-none'
                  : 'border-white/10 hover:border-sky-400/50 hover:shadow-lg hover:shadow-sky-400/20'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
                {isLocked && (
                  <svg
                    className="w-6 h-6 text-white/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
              </div>
              {helper && (
                <p className="text-sm text-white/60 mb-6">
                  {isLocked ? 'Complete previous sections to unlock' : helper}
                </p>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
