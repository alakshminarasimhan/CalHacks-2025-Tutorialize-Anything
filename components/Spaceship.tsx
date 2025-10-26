'use client'

interface SpaceshipProps {
  y?: number
  xSway?: number
  glow?: boolean
  className?: string
}

export default function Spaceship({ y = 0, xSway = 0, glow = false, className = '' }: SpaceshipProps) {
  return (
    <div
      className={`fixed left-1/2 top-1/3 -translate-x-1/2 transition-transform duration-100 ${className}`}
      style={{
        transform: `translate(-50%, ${y}px) translateX(${xSway}px)`,
        zIndex: 20,
      }}
    >
      {/* Ship image */}
      <img
        src="/assets/ship/ship.svg"
        alt="Spaceship"
        className="w-32 h-16 object-contain"
      />
    </div>
  )
}
