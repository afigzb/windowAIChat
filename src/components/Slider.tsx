/**
 * 滑块组件（用于调整参数）
 */

export function Slider({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  marks,
  formatValue = (v) => v.toString()
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  marks?: string[]
  formatValue?: (value: number) => string
}) {
  return (
    <div className="space-y-4">
      <label className="block text-base font-semibold text-gray-800">
        {label} <span className="font-normal text-gray-600">({formatValue(value)})</span>
      </label>
      <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200 shadow-sm">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
        {marks && (
          <div className="flex justify-between text-sm text-gray-600 font-medium mt-3">
            {marks.map((mark, i) => <span key={i}>{mark}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

