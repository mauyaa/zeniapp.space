import React from 'react';
import { Link } from 'react-router-dom';

const benefits = [
  'Verification badge visible on every listing.',
  'Lead inbox built for serious buyers and tenants.',
  'Faster scheduling with clear availability slots.',
];

export function AgentSection() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
      <div>
        <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-[var(--zeni-black)]">
          For agents who want <span className="font-medium">serious leads.</span>
        </h2>
        <p className="mt-3 text-[var(--zeni-black)]/55 max-w-xl font-light">
          ZENI helps verified agents across Kenya build trust and respond faster.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--zeni-black)]/8 bg-[var(--zeni-white)] p-6">
        <div className="space-y-4">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--zeni-green)] flex-shrink-0" />
              <span className="text-sm text-[var(--zeni-black)]/55 font-light leading-relaxed">
                {benefit}
              </span>
            </div>
          ))}
        </div>
        <Link
          to="/agentlogin"
          className="mt-8 inline-flex font-mono text-xs uppercase tracking-widest text-[var(--zeni-green)] hover:text-[var(--zeni-black)] transition-colors"
        >
          Open Agent Portal →
        </Link>
      </div>
    </div>
  );
}
