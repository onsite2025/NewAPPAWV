"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string, label: string }>
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
      </div>
    )
  }
)
Select.displayName = "Select"

// Simplified versions of the components needed for compatibility
export const SelectGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
export const SelectValue: React.FC<{ placeholder?: string }> = () => null
export const SelectTrigger: React.FC<{ className?: string, children: React.ReactNode }> = ({ children }) => <>{children}</>
export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
export const SelectLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
export const SelectItem: React.FC<{ value: string, children: React.ReactNode }> = ({ children }) => <>{children}</>
export const SelectSeparator: React.FC = () => null 