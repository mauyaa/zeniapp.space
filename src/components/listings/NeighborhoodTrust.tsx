import React from 'react';
import { Zap, Droplets, Car, ShieldCheck, AlertCircle, Info } from 'lucide-react';

type Tier = 'good' | 'ok' | 'poor';

interface NeighborhoodData {
    safety: Tier;
    safetyNote: string;
    water: Tier;
    waterNote: string;
    power: Tier;
    powerNote: string;
    parking: Tier;
    parkingNote: string;
    serviceCharge?: string;
}

const NEIGHBORHOODS: Record<string, NeighborhoodData> = {
    kilimani: {
        safety: 'good', safetyNote: 'Low crime area with active neighbourhood watch',
        water: 'ok', waterNote: 'Municipal supply + most buildings have tanks/backup',
        power: 'good', powerNote: 'Reliable KPLC supply; many buildings have generators',
        parking: 'good', parkingNote: 'Most apartment blocks have basement or surface parking',
        serviceCharge: 'Typically KES 5K–15K/mo for apartments'
    },
    westlands: {
        safety: 'good', safetyNote: 'Commercial hub, well-lit, active 24/7',
        water: 'ok', waterNote: 'Fairly reliable; occasional rationing during dry season',
        power: 'good', powerNote: 'KPLC prioritises this commercial zone',
        parking: 'ok', parkingNote: 'Street parking tight; prefer buildings with dedicated bays',
        serviceCharge: 'Typically KES 8K–20K/mo'
    },
    karen: {
        safety: 'good', safetyNote: 'Low density, gated estates, quiet neighbourhood',
        water: 'poor', waterNote: 'Largely borehole-dependent; confirm water source before signing',
        power: 'ok', powerNote: 'Good supply but outages during storms; inverters common',
        parking: 'good', parkingNote: 'Houses typically have ample parking and garages',
        serviceCharge: 'Typically KES 10K–25K/mo for gated estates'
    },
    lavington: {
        safety: 'good', safetyNote: 'Quiet residential, well-maintained roads',
        water: 'ok', waterNote: 'Mostly reliable; occasional cuts in dry months',
        power: 'good', powerNote: 'Stable supply; generators common in apartments',
        parking: 'good', parkingNote: 'Houses have driveways; apartments have basement parking',
        serviceCharge: 'Typically KES 6K–15K/mo'
    },
    runda: {
        safety: 'good', safetyNote: 'Exclusive estate with 24/7 security at main gates',
        water: 'poor', waterNote: 'Borehole-dependent; verify supply before committing',
        power: 'ok', powerNote: 'Stable but remote from main grid; generator recommended',
        parking: 'good', parkingNote: 'All properties have private driveways',
        serviceCharge: 'Estate levy ~KES 15K–30K/mo'
    },
    parklands: {
        safety: 'good', safetyNote: 'Safe, family-oriented, mixed residential-commercial',
        water: 'ok', waterNote: 'Generally reliable municipal supply',
        power: 'good', powerNote: 'Good KPLC coverage',
        parking: 'ok', parkingNote: 'Varies by building; confirm before viewing',
        serviceCharge: 'Typically KES 5K–12K/mo'
    },
    'upper hill': {
        safety: 'good', safetyNote: 'Corporate zone, secure with active CCTV',
        water: 'good', waterNote: 'Reliable municipal supply',
        power: 'good', powerNote: 'Commercial-grade power; buildings have UPS backup',
        parking: 'ok', parkingNote: 'Buildings have parking but street space is scarce',
        serviceCharge: 'Typically KES 10K–20K/mo for serviced apartments'
    },
    cbd: {
        safety: 'ok', safetyNote: 'Busy during the day; exercise caution after 8pm',
        water: 'good', waterNote: 'Reliable municipal supply',
        power: 'good', powerNote: 'Priority grid zone',
        parking: 'poor', parkingNote: 'Very limited; use Nachos or multi-storey car parks',
        serviceCharge: 'Typically KES 3K–8K/mo'
    },
    kasarani: {
        safety: 'ok', safetyNote: 'Improving with new developments; gated estates recommended',
        water: 'ok', waterNote: 'Municipal supply; some areas use boreholes',
        power: 'ok', powerNote: 'Occasional outages; confirm generator availability',
        parking: 'good', parkingNote: 'Most estates have ample parking',
        serviceCharge: 'Typically KES 3K–8K/mo'
    },
    ruaka: {
        safety: 'ok', safetyNote: 'Growing suburb; gated communities are safest option',
        water: 'poor', waterNote: 'Borehole-dependent; ask about tank capacity',
        power: 'ok', powerNote: 'Fairly reliable; backup common in newer buildings',
        parking: 'good', parkingNote: 'Estates have adequate parking',
        serviceCharge: 'Typically KES 3K–7K/mo'
    },
    'ngong road': {
        safety: 'good', safetyNote: 'Popular transit corridor; well-policed',
        water: 'ok', waterNote: 'Municipal supply; tanks standard in apartments',
        power: 'good', powerNote: 'Stable supply',
        parking: 'ok', parkingNote: 'Most apartments have designated parking',
        serviceCharge: 'Typically KES 5K–12K/mo'
    }
};

const tierConfig: Record<Tier, { color: string; bg: string; Icon: typeof ShieldCheck }> = {
    good: { color: 'text-emerald-700', bg: 'bg-emerald-50', Icon: ShieldCheck },
    ok: { color: 'text-amber-700', bg: 'bg-amber-50', Icon: AlertCircle },
    poor: { color: 'text-red-700', bg: 'bg-red-50', Icon: AlertCircle }
};

function TrustRow({ label, tier, note, icon: Icon }: { label: string; tier: Tier; note: string; icon: typeof Zap }) {
    const cfg = tierConfig[tier];
    const TierIcon = cfg.Icon;
    return (
        <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${cfg.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider">{label}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} flex items-center gap-1`}>
                        <TierIcon className="w-3 h-3" />
                        {tier === 'good' ? 'Good' : tier === 'ok' ? 'Moderate' : 'Limited'}
                    </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{note}</p>
            </div>
        </div>
    );
}

interface NeighborhoodTrustProps {
    neighborhood?: string;
}

function normalizeNeighborhood(name?: string): string {
    return (name || '').toLowerCase().trim().replace(/,.*$/, '').trim();
}

export function NeighborhoodTrust({ neighborhood }: NeighborhoodTrustProps) {
    const key = normalizeNeighborhood(neighborhood);
    const data = NEIGHBORHOODS[key];

    if (!data) {
        return (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-3">
                <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Neighbourhood notes
                </h2>
                <p className="text-xs text-zinc-400">
                    We don't have detailed notes for this area yet.{' '}
                    <a href="mailto:trust@zeniprop.co.ke" className="underline">Help us improve.</a>
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {neighborhood || 'Neighbourhood'} — Area notes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TrustRow label="Safety" tier={data.safety} note={data.safetyNote} icon={ShieldCheck} />
                <TrustRow label="Water" tier={data.water} note={data.waterNote} icon={Droplets} />
                <TrustRow label="Power" tier={data.power} note={data.powerNote} icon={Zap} />
                <TrustRow label="Parking" tier={data.parking} note={data.parkingNote} icon={Car} />
            </div>
            {data.serviceCharge && (
                <p className="text-xs text-zinc-500 border-t border-zinc-200 pt-3">
                    <span className="font-semibold text-zinc-600">Service charge:</span> {data.serviceCharge}
                </p>
            )}
            <p className="text-[10px] text-zinc-400">
                These notes are general guidance and may not reflect all buildings. Always verify with the agent.
            </p>
        </div>
    );
}
