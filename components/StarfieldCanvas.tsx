'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface Star {
  x: number
  y: number
  z: number
  px?: number
  py?: number
}

export interface StarfieldHandle {
  setMode: (mode: 'dots' | 'streaks') => void
  setVelocity: (velocity: number) => void
  setBrightness: (brightness: number) => void
}

interface StarfieldCanvasProps {
  starCount?: number
}

const StarfieldCanvas = forwardRef<StarfieldHandle, StarfieldCanvasProps>(
  ({ starCount = 3000 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const starsRef = useRef<Star[]>([])
    const modeRef = useRef<'dots' | 'streaks'>('dots')
    const velocityRef = useRef(0.5)
    const brightnessRef = useRef(1.0)
    const animationRef = useRef<number>()

    useImperativeHandle(ref, () => ({
      setMode: (mode: 'dots' | 'streaks') => {
        modeRef.current = mode
      },
      setVelocity: (velocity: number) => {
        velocityRef.current = velocity
      },
      setBrightness: (brightness: number) => {
        brightnessRef.current = brightness
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size to viewport dimensions (excluding scrollbar)
      const resize = () => {
        // Use clientWidth/clientHeight to exclude scrollbar width
        canvas.width = document.documentElement.clientWidth
        canvas.height = document.documentElement.clientHeight
      }
      resize()
      window.addEventListener('resize', resize)

      // Helpers for star distribution
      const gaussian = () => {
        // Box-Muller transform for ~N(0,1)
        let u = 0, v = 0
        while (u === 0) u = Math.random()
        while (v === 0) v = Math.random()
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
      }

      const spawnStar = (): Star => {
        // 20% centered gaussian, 80% uniform for less center density
        const useGaussian = Math.random() < 0.20
        const w = canvas.width
        const h = canvas.height
        const sigmaX = w / 3.5  // Even wider spread
        const sigmaY = h / 3.5

        const x = useGaussian
          ? gaussian() * sigmaX
          : Math.random() * w - w / 2
        const y = useGaussian
          ? gaussian() * sigmaY
          : Math.random() * h - h / 2

        // 8% chance to spawn closer to camera (reduced from 20%)
        const z = Math.random() < 0.08 ? 40 + Math.random() * 80 : Math.random() * w

        return { x, y, z }
      }

      // Initialize stars with random z-depths for smooth continuous flow
      const stars: Star[] = []
      for (let i = 0; i < starCount; i++) {
        const star = spawnStar()
        // Distribute stars evenly throughout z-space to prevent throbbing
        star.z = Math.random() * canvas.width
        stars.push(star)
      }
      starsRef.current = stars

      // Animation loop
      const animate = () => {
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const velocity = velocityRef.current
        const mode = modeRef.current
        const brightness = brightnessRef.current
        
        // Adjust trail clear based on mode - much less clearing in hyperspace for smoother streaks
        const clearAlpha = mode === 'streaks' ? 0.02 : 0.15
        ctx.fillStyle = `rgba(0, 0, 0, ${clearAlpha})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        stars.forEach((star) => {
          // Move star toward camera (decrease z)
          star.z -= velocity
          
          // Reset if behind camera
          if (star.z <= 0) {
            if (mode === 'streaks') {
              // In hyperspace: spawn stars uniformly across the entire screen
              const spread = canvas.width * 0.6  // 60% of screen width
              star.x = (Math.random() - 0.5) * spread
              star.y = (Math.random() - 0.5) * (canvas.height * 0.6)
              // Randomize z-depth to prevent waves/throbbing
              star.z = canvas.width * (0.3 + Math.random() * 0.7)
            } else {
              // Normal mode: spawn with original distribution
              const s = spawnStar()
              star.x = s.x
              star.y = s.y
              star.z = s.z
            }
          }

          // Project 3D to 2D
          const k = 128 / star.z
          const px = star.x * k + centerX
          const py = star.y * k + centerY

          // Skip if off screen
          if (px < 0 || px > canvas.width || py < 0 || py > canvas.height) {
            star.px = px
            star.py = py
            return
          }

          // Size based on depth
          const size = (1 - star.z / canvas.width) * 2

          if (mode === 'streaks' && star.px !== undefined && star.py !== undefined) {
            // Draw streak from previous position toward viewer
            // Scale streak length with velocity for elongated Star Wars effect
            const maxLen = Math.min(velocity * 50, 800) // Much longer, more elongated streaks
            let sx = star.px
            let sy = star.py
            const dx = px - sx
            const dy = py - sy
            const len = Math.hypot(dx, dy)
            if (len > maxLen) {
              const scale = maxLen / len
              sx = px - dx * scale
              sy = py - dy * scale
            }

            // Smoother, more gradual opacity increase for cinematic effect
            // Reduced opacity and added blue tint for less harsh white
            const streakOpacity = Math.min(0.6, brightness * (velocity / 12))
            const gradient = ctx.createLinearGradient(sx, sy, px, py)
            gradient.addColorStop(0, 'rgba(200, 220, 255, 0)')
            gradient.addColorStop(0.3, `rgba(200, 220, 255, ${streakOpacity * 0.25})`)
            gradient.addColorStop(1, `rgba(220, 235, 255, ${streakOpacity})`)

            ctx.strokeStyle = gradient
            ctx.lineWidth = Math.max(size * 1.5, 2.5) // Thicker, more visible lines
            ctx.lineCap = 'round' // Smoother line endings
            ctx.beginPath()
            ctx.moveTo(sx, sy)
            ctx.lineTo(px, py)
            ctx.stroke()
          } else {
            // Draw dot
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.8 * (1 - star.z / canvas.width) * brightness)})`
            ctx.beginPath()
            ctx.arc(px, py, size, 0, Math.PI * 2)
            ctx.fill()
          }

          star.px = px
          star.py = py
        })

        animationRef.current = requestAnimationFrame(animate)
      }

      animate()

      return () => {
        window.removeEventListener('resize', resize)
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }, [starCount])

    return (
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ 
          zIndex: 0,
          maxWidth: '100vw',
          maxHeight: '100vh',
          display: 'block'
        }}
      />
    )
  }
)

StarfieldCanvas.displayName = 'StarfieldCanvas'

export default StarfieldCanvas
