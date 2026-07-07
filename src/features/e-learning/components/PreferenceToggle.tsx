'use client'

import { Loader2 } from 'lucide-react'

interface Props {
  label: string
  checked: boolean
  disabled?: boolean
  isPending?: boolean
  onChange: (checked: boolean) => void
}

/** ConsentSwitch と同型の pill トグル（学習プリファレンス用） */
export function PreferenceToggle({
  label,
  checked,
  disabled = false,
  isPending = false,
  onChange,
}: Props) {
  const isDisabled = disabled || isPending

  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span
        className={`text-xs font-medium whitespace-nowrap ${
          disabled ? 'text-gray-300' : 'text-gray-600'
        }`}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={() => !isDisabled && onChange(!checked)}
        disabled={isDisabled}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FD7601]/40 ${
          checked ? 'bg-[#FD7601]' : 'bg-gray-200'
        } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
        </span>
      </button>
    </div>
  )
}
