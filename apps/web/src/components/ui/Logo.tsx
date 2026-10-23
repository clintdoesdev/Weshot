import { cx } from './cx';

/** UI spec §2.1: yellow rounded square with a black window glyph, then "WeShot". */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  const mark = size === 'sm' ? 28 : 30;
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <svg width={mark} height={mark} viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="9" fill="#FFD60A" />
        <rect x="7" y="8.5" width="16" height="13" rx="2.5" fill="none" stroke="#000" strokeWidth="1.9" />
        <line x1="7" y1="12.5" x2="23" y2="12.5" stroke="#000" strokeWidth="1.9" />
      </svg>
      <span className={cx('font-semibold text-white', size === 'sm' ? 'text-[17px]' : 'text-[19px]')}>WeShot</span>
    </span>
  );
}
