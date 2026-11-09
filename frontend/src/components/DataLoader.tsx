import { BanknotesIcon } from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

interface DataLoaderProps {
  label?: string;
  className?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Shared loading state for page and table data. */
export default function DataLoader({ label = 'Cargando datos', className = '', icon: Icon = BanknotesIcon }: DataLoaderProps) {
  return (
    <div role="status" aria-live="polite" className={`flex min-h-[240px] w-full items-center justify-center bg-white/90 px-6 py-10 ${className}`}>
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF3EC]">
          <span className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-[#538f65] motion-safe:animate-spin" />
          <Icon className="h-7 w-7 text-[#538f65]" />
        </span>
        <div className="w-full">
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#edf2ed]" aria-hidden="true">
            <div className="h-full w-1/3 rounded-full bg-[#538f65] motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
