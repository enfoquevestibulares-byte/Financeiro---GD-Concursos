interface BrandMarkProps {
  variant?: 'dark-bg' | 'light-bg';
  showSubtitle?: boolean;
}

export function BrandMark({ variant = 'dark-bg', showSubtitle = true }: BrandMarkProps) {
  const isDark = variant === 'dark-bg';

  return (
    <div className="select-none shrink-0">
      <div className="flex items-baseline gap-1 text-[20px] leading-none tracking-tight whitespace-nowrap">
        <span className={isDark ? 'font-bold text-[#FFAA00]' : 'font-bold text-[#111111]'}>
          Gustavo
        </span>
        <span className={isDark ? 'font-normal text-white' : 'font-normal text-[#111111]'}>
          Dias
        </span>
      </div>
      {showSubtitle && (
        <div
          className={`mt-1 text-[9px] font-medium tracking-[0.42em] uppercase whitespace-nowrap ${
            isDark ? 'text-white/80' : 'text-[#022659]/80'
          }`}
        >
          CONCURSOS
        </div>
      )}
    </div>
  );
}
