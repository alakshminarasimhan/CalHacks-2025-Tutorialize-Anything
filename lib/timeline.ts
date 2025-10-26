// Scroll timeline management with section labels

export type SectionLabel = 'intro' | 'login' | 'url' | 'style' | 'advanced' | 'gate' | 'viewer'

export interface ScrollTimeline {
  labels: Map<SectionLabel, number> // section -> scroll progress (0-1)
  currentSection: SectionLabel
  progress: number // overall scroll progress 0-1
}

export function createScrollTimeline(): ScrollTimeline {
  return {
    labels: new Map([
      ['intro', 0],
      ['login', 0.14],
      ['url', 0.28],
      ['style', 0.42],
      ['advanced', 0.56],
      ['gate', 0.7],
      ['viewer', 0.84],
    ]),
    currentSection: 'intro',
    progress: 0,
  }
}

export function updateScrollProgress(
  scrollY: number,
  documentHeight: number,
  windowHeight: number
): number {
  const maxScroll = documentHeight - windowHeight
  return maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0
}

export function getCurrentSection(progress: number, timeline: ScrollTimeline): SectionLabel {
  let current: SectionLabel = 'intro'
  
  timeline.labels.forEach((threshold, label) => {
    if (progress >= threshold) {
      current = label
    }
  })
  
  return current
}

export function getSectionProgress(
  section: SectionLabel,
  overallProgress: number,
  timeline: ScrollTimeline
): number {
  const labels = Array.from(timeline.labels.entries()).sort((a, b) => a[1] - b[1])
  const currentIndex = labels.findIndex(([label]) => label === section)
  
  if (currentIndex === -1) return 0
  
  const [, start] = labels[currentIndex]
  const end = currentIndex < labels.length - 1 ? labels[currentIndex + 1][1] : 1
  
  const sectionRange = end - start
  if (sectionRange === 0) return 1
  
  const sectionProgress = (overallProgress - start) / sectionRange
  return Math.min(Math.max(sectionProgress, 0), 1)
}
