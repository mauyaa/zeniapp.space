import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-6 py-10 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted))]">Ready</div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[rgb(var(--text))]">
              Ready to find a home in Kenya?
            </h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))] max-w-xl">
              ZENI is a Kenyan real estate management system. Explore verified listings around Kenya
              and connect with trusted agents.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              to="/app/explore"
              className="text-[rgb(var(--accent))] underline underline-offset-4"
            >
              Explore map
            </Link>
            <Link
              to="/login"
              className="text-[rgb(var(--muted))] underline underline-offset-4 hover:text-[rgb(var(--text))]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-[rgb(var(--border))] pt-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between text-sm text-[rgb(var(--muted))]">
          <div className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted))]">
            ZENI · Kenyan Real Estate
          </div>
          <div className="flex flex-wrap gap-6">
            <Link to="/login" className="hover:text-[rgb(var(--accent))]">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-[rgb(var(--accent))]">
              Register
            </Link>
            <Link to="/agentlogin" className="hover:text-[rgb(var(--accent))]">
              Agent portal
            </Link>
            <a href="mailto:zeniapp.ke@gmail.com" className="hover:text-[rgb(var(--accent))]">
              Contact
            </a>
          </div>
        </div>
        <div className="mt-6 text-xs text-[rgb(var(--muted))]">
          (c) ZENI. Kenyan Real Estate Management System. Illustrative content for demo purposes.
        </div>
      </footer>
    </div>
  );
}
