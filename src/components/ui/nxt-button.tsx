'use client';
import { type ReactNode, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styles: Record<Variant, string> = {
  primary:   'bg-[#ff6600] text-black font-bold hover:bg-[#ff7700] active:bg-[#ee5500]',
  secondary: 'bg-transparent text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60',
  ghost:     'bg-transparent text-white/30 hover:text-white/50 hover:bg-white/[0.03]',
};

export function Button({ variant = 'primary', children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`
        font-mono text-[11px] tracking-[0.05em] uppercase
        px-4 py-2 rounded-sm cursor-pointer
        transition-all duration-150
        min-h-[36px] min-w-[44px]
        disabled:opacity-30 disabled:cursor-not-allowed
        ${styles[variant]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
