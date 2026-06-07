import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="font-[family-name:var(--font-raleway)] text-sm font-semibold text-[#1e1a18] tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded border px-3 py-2.5',
            'bg-[#f4f1e8] text-[#1e1a18]',
            'font-[family-name:var(--font-cormorant)] text-base',
            'placeholder:text-[#1e1a18]/40',
            'focus:outline-none focus:ring-2 focus:ring-[#9a7c2e] focus:border-transparent',
            'transition-shadow duration-150',
            error ? 'border-[#6b2737]' : 'border-[#c4a96a]',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <p className="font-[family-name:var(--font-raleway)] text-xs text-[#6b2737]">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
