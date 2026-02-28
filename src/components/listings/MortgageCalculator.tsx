import React, { useState, useMemo } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

interface MortgageCalculatorProps {
    /** Property price in KES */
    price: number;
}

function formatKES(v: number) {
    return `KES ${Math.round(v).toLocaleString('en-KE')}`;
}

/**
 * Simple KES mortgage / home-loan calculator widget.
 * Placed on the Listing Detail Page sidebar.
 * Inputs: home price (pre-filled), deposit %, loan term, interest rate.
 * No external library — pure arithmetic.
 */
export function MortgageCalculator({ price }: MortgageCalculatorProps) {
    const [open, setOpen] = useState(false);
    const [depositPct, setDepositPct] = useState(20);
    const [termYears, setTermYears] = useState(20);
    const [annualRate, setAnnualRate] = useState(13.5); // average Kenya bank rate

    const { monthly, totalInterest, loanAmount } = useMemo(() => {
        const deposit = (depositPct / 100) * price;
        const principal = price - deposit;
        const r = annualRate / 100 / 12;
        const n = termYears * 12;
        if (r === 0) {
            return {
                monthly: principal / n,
                totalInterest: 0,
                loanAmount: principal,
            };
        }
        const monthly = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        return {
            monthly,
            totalInterest: monthly * n - principal,
            loanAmount: principal,
        };
    }, [price, depositPct, termYears, annualRate]);

    return (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-zinc-50 transition-colors"
                aria-expanded={open}
            >
                <span className="flex items-center gap-2 text-sm font-semibold text-zeni-foreground">
                    <Calculator className="w-4 h-4 text-green-600" />
                    Mortgage Calculator
                </span>
                {open ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
            </button>

            {open && (
                <div className="px-4 pb-5 space-y-4 border-t border-zinc-100">
                    {/* Monthly payment hero */}
                    <div className="pt-4 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-center">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-green-700 mb-1">
                            Est. monthly payment
                        </p>
                        <p className="text-2xl font-bold font-mono text-green-800">
                            {formatKES(monthly)}
                        </p>
                        <p className="text-[10px] text-green-600 mt-1">
                            Loan: {formatKES(loanAmount)} · Interest: {formatKES(totalInterest)}
                        </p>
                    </div>

                    {/* Deposit % */}
                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Deposit
                            </label>
                            <span className="text-[10px] font-mono font-semibold text-zeni-foreground">
                                {depositPct}% · {formatKES((depositPct / 100) * price)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={5}
                            max={50}
                            step={5}
                            value={depositPct}
                            onChange={(e) => setDepositPct(Number(e.target.value))}
                            className="mortgage-slider"
                            aria-label="Deposit percentage"
                        />
                        <div className="flex justify-between text-[9px] text-zinc-400 font-mono mt-0.5">
                            <span>5%</span><span>50%</span>
                        </div>
                    </div>

                    {/* Term */}
                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Loan term
                            </label>
                            <span className="text-[10px] font-mono font-semibold text-zeni-foreground">
                                {termYears} years
                            </span>
                        </div>
                        <input
                            type="range"
                            min={5}
                            max={30}
                            step={5}
                            value={termYears}
                            onChange={(e) => setTermYears(Number(e.target.value))}
                            className="mortgage-slider"
                            aria-label="Loan term in years"
                        />
                        <div className="flex justify-between text-[9px] text-zinc-400 font-mono mt-0.5">
                            <span>5 yr</span><span>30 yr</span>
                        </div>
                    </div>

                    {/* Rate */}
                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Interest rate
                            </label>
                            <span className="text-[10px] font-mono font-semibold text-zeni-foreground">
                                {annualRate.toFixed(1)}% p.a.
                            </span>
                        </div>
                        <input
                            type="range"
                            min={8}
                            max={22}
                            step={0.5}
                            value={annualRate}
                            onChange={(e) => setAnnualRate(Number(e.target.value))}
                            className="mortgage-slider"
                            aria-label="Annual interest rate"
                        />
                        <div className="flex justify-between text-[9px] text-zinc-400 font-mono mt-0.5">
                            <span>8%</span><span>22%</span>
                        </div>
                    </div>

                    <p className="text-[9px] text-zinc-400 leading-relaxed">
                        * Indicative estimate only. Actual payments depend on your lender's terms,
                        insurance, and applicable taxes. Consult your bank or SACCO for a formal quote.
                    </p>
                </div>
            )}
        </div>
    );
}
