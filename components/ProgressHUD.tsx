'use client'

interface ProgressHUDProps {
  currentStep: number // 0, 1, 2
}

const steps = [
  'Analyzing source...',
  'Creating frames...',
  'Preparing viewer...',
]

export default function ProgressHUD({ currentStep }: ProgressHUDProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-sky-400" />
          </div>
          
          <h3 className="text-xl font-semibold mb-6">Generating Tutorial</h3>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 transition-opacity duration-300 ${
                  index <= currentStep ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    index < currentStep
                      ? 'border-sky-400 bg-sky-400'
                      : index === currentStep
                      ? 'border-sky-400 bg-transparent'
                      : 'border-white/20 bg-transparent'
                  }`}
                >
                  {index < currentStep && (
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
