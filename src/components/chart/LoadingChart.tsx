import Image from 'next/image'

interface LoadingChartProps {
  message?: string
}

export default function LoadingChart({ message = 'Calculating your chart...' }: LoadingChartProps) {
  return (
    <div className="min-h-screen bg-[#f4f1e8] flex flex-col items-center justify-center gap-8">
      <Image
        src="https://assets.cdn.filesafe.space/YYc9Wjz5jWmWNvqrL19t/media/6a244cd549e55f851989f74d.png"
        alt="MotorSui"
        width={160}
        height={48}
        className="h-12 w-auto"
        priority
      />

      <div className="flex flex-col items-center gap-5">
        <svg
          className="animate-spin h-10 w-10 text-[#9a7c2e]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-20"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="font-[family-name:var(--font-cormorant)] text-xl text-[#1e1a18]/70 tracking-wide">
          {message}
        </p>
      </div>
    </div>
  )
}
