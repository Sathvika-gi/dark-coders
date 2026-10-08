import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, AlertCircle, CheckCircle, Navigation } from 'lucide-react';

export function TruckCard({ truck }: { truck: any }) {
  const isCritical = truck.status === 'critical';
  const isAtRisk = truck.status === 'at_risk';
  
  return (
    <Link href={`/trucks/${truck.id}`} className={`block bg-white rounded-2xl border-2 transition-all p-5 hover:-translate-y-1 hover:shadow-lg ${isCritical ? 'border-critical' : isAtRisk ? 'border-caution' : 'border-border'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-serif font-medium text-lg text-green-black">{truck.code}</h3>
          <p className="text-xs text-muted font-mono">{truck.plate}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${isCritical ? 'bg-critical-bg text-critical' : isAtRisk ? 'bg-caution-bg text-caution' : 'bg-fresh-bg text-leaf'}`}>
          {isCritical ? <AlertCircle size={12} /> : isAtRisk ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
          {isCritical ? 'Critical' : isAtRisk ? 'At risk' : 'Fresh'}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-4 text-sm text-green-black">
        <Navigation size={14} className="text-muted" />
        <span className="truncate">{truck.origin}</span>
        <ArrowRight size={12} className="text-muted shrink-0" />
        <span className="truncate">{truck.destination}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-cream h-1.5 rounded-full mb-4 overflow-hidden relative">
        <div 
          className="absolute left-0 top-0 bottom-0 bg-leaf rounded-full transition-all"
          style={{ width: `${truck.progressPct}%` }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 bg-white border border-border rounded shadow-sm flex items-center justify-center text-[10px]"
          style={{ left: `calc(${truck.progressPct}% - 10px)`, width: 20, height: 14 }}
        >
          🚛
        </div>
      </div>

      <div className="flex items-center justify-between mt-5">
        <div className="flex -space-x-2">
          {truck.produceEmojis.map((emoji: string, i: number) => (
            <div key={i} className="w-7 h-7 rounded-full bg-cream border border-white flex items-center justify-center text-sm z-10">
              {emoji}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="px-2 py-1 bg-cream rounded-md text-xs font-medium text-green-black whitespace-nowrap">
            🌡 {truck.cargo_temp}°C
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs">
        <span className="text-muted">Soonest to spoil:</span>
        <span className={`font-medium ${isCritical ? 'text-critical' : 'text-green-black'}`}>{truck.soonestSpoil}</span>
      </div>
    </Link>
  );
}
