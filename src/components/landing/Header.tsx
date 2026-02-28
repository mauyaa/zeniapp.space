import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { NavLink } from './NavLink';

const navItems = [
  { label: 'Intro', href: '#intro', active: true },
  { label: 'Listings', href: '#listings' },
  { label: 'Trust', href: '#trust' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Agents', href: '#agents' },
  { label: 'Contact', href: '#contact' }
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[rgb(var(--bg)/0.92)] backdrop-blur border-b border-[rgb(var(--border))] shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div
        className={clsx(
          'mx-auto flex items-center justify-between px-4 transition-all duration-300 max-w-7xl',
          scrolled ? 'h-14' : 'h-16'
        )}
      >
        <Link to="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-[rgb(var(--text))]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--accent))]">
            Z
          </span>
          ZENI · Kenyan Real Estate
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} active={item.active} />
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            to="/login"
            className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--muted))] hover:text-[rgb(var(--accent))]"
          >
            Sign in
          </Link>
          <Link
            to="/app/explore"
            className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[rgb(var(--text))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
          >
            Explore Map
          </Link>
          <a
            href="#listings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))]"
            aria-label="Scroll to listings"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14" strokeLinecap="round" />
              <path d="M7 14l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 7h16" strokeLinecap="round" />
            <path d="M4 12h16" strokeLinecap="round" />
            <path d="M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))] lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={item.active}
                onClick={() => setMenuOpen(false)}
              />
            ))}
            <div className="flex items-center gap-4 pt-3">
              <Link to="/login" className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--accent))]">
                Sign in
              </Link>
              <Link
                to="/app/explore"
                className="text-sm text-[rgb(var(--accent))] underline underline-offset-4"
              >
                Explore Map
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
