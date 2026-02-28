import React from 'react';
import { Link } from 'react-router-dom';

const benefits = [
  'Verification badge visible on every listing.',
  'Lead inbox built for serious buyers and tenants.',
  'Faster scheduling with clear availability slots.'
];

export function AgentSection() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted))]">For agents</div>
        <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-[rgb(var(--text))]">
          For agents who want serious leads.
        </h2>
        <p className="mt-3 text-base text-[rgb(var(--muted))] max-w-xl">
          ZENI helps verified agents across Kenya build trust and respond faster.
        </p>
      </div>
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="space-y-3 text-sm text-[rgb(var(--muted))]">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>
        <Link to="/agentlogin" className="mt-6 inline-flex text-sm text-[rgb(var(--accent))] underline underline-offset-4">
          Open Agent Portal &rarr;
        </Link>
      </div>
    </div>
  );
}
