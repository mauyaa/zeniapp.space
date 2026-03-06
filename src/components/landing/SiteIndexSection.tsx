import React from 'react';
import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'General',
    links: [
      { label: 'Intro', href: '#intro' },
      { label: 'Listings', href: '#listings' },
      { label: 'Trust', href: '#trust' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Seekers',
    links: [
      { label: 'For Rent', href: '#listings' },
      { label: 'For Sale', href: '#listings' },
      { label: 'Saved Listings', href: '/login', router: true },
      { label: 'Alerts', href: '/login', router: true },
    ],
  },
  {
    title: 'Agents',
    links: [
      { label: 'Agent Portal', href: '/agentlogin', router: true },
      { label: 'Verification', href: '#agents' },
      { label: 'Pricing', href: '#contact' },
      { label: 'Support', href: '#contact' },
    ],
  },
];

export function SiteIndexSection() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr,2fr]">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted))]">
          Driven by trust.
        </div>
        <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgb(var(--text))]">
          A simple way to navigate verified property.
        </h2>
        <p className="mt-4 text-base text-[rgb(var(--muted))] max-w-sm">
          Clear paths for seekers and agents, built for Kenya.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <div className="text-xs uppercase tracking-[0.25em] text-[rgb(var(--muted))]">
              {column.title}
            </div>
            <div className="flex flex-col gap-2 text-sm text-[rgb(var(--muted))]">
              {column.links.map((link) =>
                link.router ? (
                  <Link key={link.label} to={link.href} className="hover:text-[rgb(var(--accent))]">
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} className="hover:text-[rgb(var(--accent))]">
                    {link.label}
                  </a>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
