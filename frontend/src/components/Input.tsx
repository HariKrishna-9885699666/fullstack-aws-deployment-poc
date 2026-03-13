import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
           <label className="block text-sm font-semibold text-slate-300 mb-2 cursor-default select-none">
             {label}
           </label>
        )}
        <input
          className={cn(
            "flex h-12 w-full rounded-xl border border-white/10 bg-gray-800/50 backdrop-blur-sm px-4 py-3 text-sm text-slate-100 transition-all placeholder:text-slate-500 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 cursor-text file:border-0 file:bg-transparent file:text-sm file:font-medium file:cursor-pointer",
            error && "border-rose-500/50 focus-visible:ring-rose-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-rose-400 flex items-center gap-1">
            <span className="inline-block">⚠</span>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
