// Audio management utility for background music and hyperspace audio

interface AudioManager {
  playBackgroundMusic: () => void
  stopBackgroundMusic: () => void
  playHyperspace: () => void
  stopHyperspace: () => void
  setMuted: (muted: boolean) => void
  cleanup: () => void
  isBackgroundPlaying: () => boolean
}

class AudioManagerImpl implements AudioManager {
  private backgroundMusic: HTMLAudioElement | null = null
  private hyperspaceAudio: HTMLAudioElement | null = null
  private isMuted: boolean = false
  private backgroundMusicVolume: number = 0.3 // 30% volume for background music
  private hyperspaceVolume: number = 0.5 // 50% volume for hyperspace
  private isFadingHyperspace: boolean = false
  private wasBackgroundPlaying: boolean = false
  private wasHyperspacePlaying: boolean = false

  constructor() {
    if (typeof window === 'undefined') return

    // Initialize background music
    this.backgroundMusic = new Audio('/audio/background.mp3')
    this.backgroundMusic.loop = true
    this.backgroundMusic.volume = this.backgroundMusicVolume
    
    // Add error handler
    this.backgroundMusic.addEventListener('error', (e) => {
      console.error('Background music failed to load:', e)
      console.error('Attempted path: /audio/background.mp3')
    })
    
    this.backgroundMusic.addEventListener('canplaythrough', () => {
      console.log('Background music loaded and ready to play')
    })

    // Initialize hyperspace audio
    this.hyperspaceAudio = new Audio('/audio/hyperspace.mp3')
    this.hyperspaceAudio.loop = true
    this.hyperspaceAudio.volume = this.hyperspaceVolume
  }

  playBackgroundMusic(): void {
    if (!this.backgroundMusic) {
      console.error('Background music not initialized')
      return
    }
    
    if (this.isMuted) {
      console.log('Audio is muted, skipping playback')
      return
    }
    
    // Check if already playing
    if (!this.backgroundMusic.paused) {
      console.log('Background music already playing')
      return
    }
    
    console.log('🎵 Attempting to start background music...')
    console.log('Muted:', this.isMuted)
    console.log('Audio element:', this.backgroundMusic)
    console.log('Ready state:', this.backgroundMusic.readyState)
    
    // Set volume immediately (no fade for now to test)
    this.backgroundMusic.volume = this.backgroundMusicVolume
    
    this.backgroundMusic.play()
      .then(() => {
        console.log('✅ Background music started successfully!')
        console.log('Playing:', !this.backgroundMusic?.paused)
        console.log('Volume:', this.backgroundMusic?.volume)
      })
      .catch(err => {
        console.error('❌ Failed to play background music:', err)
        console.error('Error name:', err.name)
        console.error('Error message:', err.message)
        console.log('💡 Browser may be blocking autoplay. Click anywhere on the page to start.')
      })
  }

  stopBackgroundMusic(): void {
    if (!this.backgroundMusic) return
    
    console.log('Stopping background music...')
    
    // Fade out background music
    let volume = this.backgroundMusic.volume
    const fadeOut = setInterval(() => {
      if (volume > 0) {
        volume -= 0.05
        if (this.backgroundMusic) {
          this.backgroundMusic.volume = Math.max(volume, 0)
        }
      } else {
        if (this.backgroundMusic) {
          this.backgroundMusic.pause()
          this.backgroundMusic.currentTime = 0
          console.log('Background music stopped')
        }
        clearInterval(fadeOut)
      }
    }, 50)
  }

  playHyperspace(): void {
    if (this.isMuted || !this.hyperspaceAudio) return
    
    // Start hyperspace audio with fade in
    this.hyperspaceAudio.volume = 0
    this.hyperspaceAudio.play().catch(err => console.warn('Failed to play hyperspace audio:', err))
    
    let volume = 0
    const fadeIn = setInterval(() => {
      if (volume < this.hyperspaceVolume) {
        volume += 0.03
        if (this.hyperspaceAudio) {
          this.hyperspaceAudio.volume = Math.min(volume, this.hyperspaceVolume)
        }
      } else {
        clearInterval(fadeIn)
      }
    }, 50)
  }

  stopHyperspace(): void {
    if (!this.hyperspaceAudio || this.isFadingHyperspace) return
    
    this.isFadingHyperspace = true
    
    // Fade out hyperspace audio smoothly
    let volume = this.hyperspaceAudio.volume
    const fadeOut = setInterval(() => {
      if (volume > 0) {
        volume -= 0.03 // Slower fade for smoother transition
        if (this.hyperspaceAudio) {
          this.hyperspaceAudio.volume = Math.max(volume, 0)
        }
      } else {
        if (this.hyperspaceAudio) {
          this.hyperspaceAudio.pause()
          this.hyperspaceAudio.currentTime = 0
        }
        this.isFadingHyperspace = false
        clearInterval(fadeOut)
      }
    }, 50)
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted

    if (muted) {
      // Save what was playing
      this.wasBackgroundPlaying = this.backgroundMusic ? !this.backgroundMusic.paused : false
      this.wasHyperspacePlaying = this.hyperspaceAudio ? !this.hyperspaceAudio.paused : false

      // Immediately mute (no fade)
      if (this.backgroundMusic) {
        this.backgroundMusic.volume = 0
        this.backgroundMusic.pause()
      }
      if (this.hyperspaceAudio) {
        this.hyperspaceAudio.volume = 0
        this.hyperspaceAudio.pause()
      }
      console.log('Audio muted')
    } else {
      // Unmute and resume what was playing
      if (this.wasBackgroundPlaying && this.backgroundMusic) {
        this.backgroundMusic.volume = this.backgroundMusicVolume
        this.backgroundMusic.play().catch(err => console.warn('Failed to resume background music:', err))
        console.log('Background music resumed')
      }
      if (this.wasHyperspacePlaying && this.hyperspaceAudio) {
        this.hyperspaceAudio.volume = this.hyperspaceVolume
        this.hyperspaceAudio.play().catch(err => console.warn('Failed to resume hyperspace audio:', err))
        console.log('Hyperspace audio resumed')
      }
      console.log('Audio unmuted')
    }
  }

  isBackgroundPlaying(): boolean {
    return this.backgroundMusic ? !this.backgroundMusic.paused : false
  }

  cleanup(): void {
    // Immediate cleanup without fade
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
      this.backgroundMusic.currentTime = 0
    }
    if (this.hyperspaceAudio) {
      this.hyperspaceAudio.pause()
      this.hyperspaceAudio.currentTime = 0
    }
  }
}

// Singleton instance
let audioManager: AudioManager | null = null

export function getAudioManager(): AudioManager {
  if (!audioManager && typeof window !== 'undefined') {
    audioManager = new AudioManagerImpl()
  }
  return audioManager as AudioManager
}

