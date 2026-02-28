import React from 'react';
import clsx from 'clsx';

interface NavLinkProps {
  href: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function NavLink({ href, label, active = false, onClick }: NavLinkProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'relative pb-1 text-[11px] uppercase tracking-[0.25em] transition-colors',
        active ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]'
      )}
    >
      {label}
      <span
        className={clsx(
          'absolute left-0 -bottom-0.5 h-[1px] w-full transition-opacity',
          active ? 'bg-[rgb(var(--accent))] opacity-100' : 'opacity-0'
        )}
      />
    </a>
  );
}
