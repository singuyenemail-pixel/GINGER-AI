import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>}
        <div className="relative">
          <select
            className={cn(
              "flex h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
