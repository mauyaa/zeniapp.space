import React from 'react';

const tiles = [
  {
    title: 'Verification checks',
    description: 'Listings reviewed before they go live.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: 'Fraud reporting',
    description: 'Flag suspicious listings quickly.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 21V4l8 3 8-3v14l-8 3-8-3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: 'Secure chat',
    description: 'Message agents before sharing contacts.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 5h16v10H7l-3 3V5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: 'Fast scheduling',
    description: 'Book viewings with clear availability.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 3v3M17 3v3M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 13h4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: 'Transparent pricing',
    description: 'Clear pricing labels on every card.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 13l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

export function TrustTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div
          key={tile.title}
          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 text-sm shadow-[0_12px_26px_rgba(15,23,42,0.06)]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--accent))]">
            {tile.icon}
          </div>
          <div className="mt-3 font-semibold text-[rgb(var(--text))]">{tile.title}</div>
          <p className="mt-2 text-xs text-[rgb(var(--muted))]">{tile.description}</p>
        </div>
      ))}
    </div>
  );
}
