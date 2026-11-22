"use client";

import { useState } from "react";

/**
 * Click-to-load map: a styled static picture first (fast LCP, no third-party cookies),
 * the keyless Google Maps embed only after the visitor asks for it.
 */
export function MapFacade({ query, lat, lng }: { query: string; lat: number; lng: number }) {
  const [loaded, setLoaded] = useState(false);
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(query)}&ll=${lat},${lng}&z=16&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

  return (
    <div>
      <div className="photo relative aspect-[4/3] w-full" style={{ background: "#d9d2bd" }}>
        {loaded ? (
          <iframe
            title="Map showing Olmo"
            src={embed}
            className="absolute inset-0 size-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <>
            <svg viewBox="0 0 400 300" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect width="400" height="300" fill="#e3dcc7" />
              <path d="M0 210c60-30 90 10 150-10s70-70 130-60 80 20 120-10v170H0Z" fill="#c9d3b6" />
              <path d="M-10 120c80 10 120-40 200-30s120 50 220 20" fill="none" stroke="#b9c3d0" strokeWidth="16" />
              <g stroke="#fbf8f1" strokeWidth="9" fill="none" strokeLinecap="round">
                <path d="M-10 60 150 85 410 40" />
                <path d="M110-10 140 130 90 310" />
                <path d="M270-10 255 150 330 310" />
                <path d="M-10 250 210 215 410 255" />
              </g>
              <g stroke="#fbf8f1" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".8">
                <path d="M40 0 60 300M200 0 190 300M340 0 360 300M0 160 400 140" />
              </g>
            </svg>
            <div className="absolute left-[46%] top-[40%] -translate-x-1/2 -translate-y-full" aria-hidden="true">
              <svg width="44" height="56" viewBox="0 0 44 56">
                <path d="M22 54C22 54 4 33 4 20a18 18 0 0 1 36 0c0 13-18 34-18 34Z" fill="#26301f" />
                <circle cx="22" cy="20" r="7" fill="#d89a2b" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-end justify-start p-4">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setLoaded(true)}>
                Show map
              </button>
            </div>
          </>
        )}
      </div>
      <p className="mt-3 text-[15px]">
        <a className="link inline-flex min-h-11 items-center" href={directions} target="_blank" rel="noopener noreferrer">
          Get directions in Google Maps
        </a>
        {!loaded ? <span className="text-olive">. The map loads from Google only when you show it.</span> : null}
      </p>
    </div>
  );
}
