import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Locate, Droplet, Phone, Navigation, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase, Profile, BLOOD_GROUPS, BloodGroup, distanceKm } from '../lib/supabase';
import { BloodDrop, AvailabilityBadge, EmptyState } from '../components/ui';

export function DonorSearch() {
  const { profile } = useAuth();
  const { notify } = useToast();
  const [donors, setDonors] = useState<Profile[]>([]);
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [radius, setRadius] = useState(10);
  const [bloodFilter, setBloodFilter] = useState<BloodGroup | 'all'>('all');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const loadDonors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', profile?.id ?? '')
      .eq('is_available', true);
    setLoading(false);
    if (error) {
      notify('Could not load donors', 'error');
      return;
    }
    setDonors((data as Profile[]) ?? []);
  }, [profile, notify]);

  useEffect(() => {
    loadDonors();
    if (profile?.latitude && profile?.longitude) {
      setCenter({ lat: profile.latitude, lon: profile.longitude });
    } else if (navigator.geolocation) {
      // Proactively request permission so the browser prompt appears on page load.
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCenter(c);
          if (profile) {
            supabase.from('profiles').update({ latitude: c.lat, longitude: c.lon }).eq('id', profile.id);
          }
        },
        () => {
          /* user denied — manual entry still available */
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [loadDonors, profile]);

  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCenter(c);
        if (profile) {
          supabase.from('profiles').update({ latitude: c.lat, longitude: c.lon }).eq('id', profile.id);
        }
        notify('Location updated', 'success');
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enter coordinates manually.'
            : err.code === err.POSITION_UNAVAILABLE
            ? 'Position unavailable. Enter coordinates manually.'
            : err.code === err.TIMEOUT
            ? 'Location request timed out. Enter coordinates manually.'
            : 'Could not detect location. Enter coordinates manually.';
        notify(msg, 'error');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const applyManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) {
      notify('Enter valid latitude and longitude', 'error');
      return;
    }
    setCenter({ lat, lon });
    if (profile) {
      supabase.from('profiles').update({ latitude: lat, longitude: lon }).eq('id', profile.id);
    }
    notify('Location set', 'success');
  };

  // Compute donors within radius
  const nearbyDonors = donors.filter((d) => {
    if (!d.latitude || !d.longitude || !center) return false;
    const dist = distanceKm(center.lat, center.lon, d.latitude, d.longitude);
    return dist <= radius && (bloodFilter === 'all' || d.blood_group === bloodFilter);
  }).map((d) => ({
    ...d,
    _dist: center ? distanceKm(center.lat, center.lon, d.latitude!, d.longitude!) : 0,
  })).sort((a, b) => (a as any)._dist - (b as any)._dist);

  // Map projection: convert lat/lon to SVG coordinates centered on `center`
  // Scale: radius km maps to ~40% of map half-width
  const MAP_SIZE = 360;
  const CENTER = MAP_SIZE / 2;
  const kmToPx = (km: number) => (km / radius) * (MAP_SIZE / 2 - 20);

  const project = (lat: number, lon: number) => {
    if (!center) return { x: CENTER, y: CENTER };
    // Approximate: 1 deg lat ≈ 111 km; lon scaled by cos(lat)
    const dLat = (lat - center.lat) * 111;
    const dLon = (lon - center.lon) * 111 * Math.cos((center.lat * Math.PI) / 180);
    // y is inverted (north up)
    return {
      x: CENTER + (dLon / radius) * (MAP_SIZE / 2 - 20),
      y: CENTER - (dLat / radius) * (MAP_SIZE / 2 - 20),
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Find Nearby Donors</h1>
        <p className="text-sm text-gray-500">Search for available donors within your area</p>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Your Location</label>
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={center ? `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}` : 'Not set'}
                className="input w-56"
              />
              <button onClick={detectLocation} className="btn-secondary"><Locate className="h-4 w-4" /> Detect</button>
              <input type="number" step="any" placeholder="Lat" className="input w-24" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
              <input type="number" step="any" placeholder="Lon" className="input w-24" value={manualLon} onChange={(e) => setManualLon(e.target.value)} />
              <button onClick={applyManualLocation} className="btn-secondary">Set</button>
            </div>
            {!center && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Locate className="h-3 w-3" /> Click "Detect" then choose "Allow" in the browser prompt, or enter coordinates manually.
              </p>
            )}
          </div>
          <div>
            <label className="label">Radius</label>
            <div className="flex gap-1">
              {[5, 10, 20].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    radius === r
                      ? 'bg-blood-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Blood Group</label>
            <select value={bloodFilter} onChange={(e) => setBloodFilter(e.target.value as any)} className="input w-32">
              <option value="all">All Groups</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span><strong className="text-gray-900 dark:text-white">{nearbyDonors.length}</strong> donors found</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Map */}
        <div className="card p-6 lg:col-span-3">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Donor Map</h2>
          {!center ? (
            <EmptyState icon={<MapPin className="h-6 w-6" />} title="Set your location" subtitle="Detect your location to see nearby donors on the map." />
          ) : (
            <div className="relative mx-auto" style={{ maxWidth: MAP_SIZE }}>
              <svg ref={svgRef} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} className="w-full h-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-900">
                {/* Distance rings */}
                {[radius / 2, radius].map((r, i) => (
                  <circle
                    key={i}
                    cx={CENTER}
                    cy={CENTER}
                    r={kmToPx(r)}
                    fill="none"
                    stroke={i === 0 ? '#9ca3af' : '#d1d5db'}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                ))}
                {/* Radius label */}
                <text x={CENTER} y={CENTER - kmToPx(radius) + 12} textAnchor="middle" className="fill-gray-400 text-[10px]">
                  {radius} km radius
                </text>

                {/* Cross hairs */}
                <line x1={CENTER} y1={0} x2={CENTER} y2={MAP_SIZE} stroke="#e5e7eb" strokeWidth="0.5" />
                <line x1={0} y1={CENTER} x2={MAP_SIZE} y2={CENTER} stroke="#e5e7eb" strokeWidth="0.5" />

                {/* Center marker (you) */}
                <g>
                  <circle cx={CENTER} cy={CENTER} r="8" fill="#dc2626" opacity="0.3" className="animate-pulse" />
                  <circle cx={CENTER} cy={CENTER} r="5" fill="#dc2626" />
                  <text x={CENTER + 10} y={CENTER + 4} className="fill-blood-700 text-[10px] font-semibold">You</text>
                </g>

                {/* Donor markers */}
                {nearbyDonors.map((d) => {
                  const p = project(d.latitude!, d.longitude!);
                  const clamped = {
                    x: Math.max(12, Math.min(MAP_SIZE - 12, p.x)),
                    y: Math.max(12, Math.min(MAP_SIZE - 12, p.y)),
                  };
                  return (
                    <g key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
                      <circle cx={clamped.x} cy={clamped.y} r="9" fill="#dc2626" opacity="0.2" />
                      <circle cx={clamped.x} cy={clamped.y} r="6" fill="#dc2626" />
                      <text x={clamped.x} y={clamped.y + 2.5} textAnchor="middle" className="fill-white text-[7px] font-bold pointer-events-none">
                        {d.blood_group.replace('+', '⁺').replace('-', '⁻')}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blood-600" /> You</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blood-600 opacity-50" /> Available donor</span>
              </div>
            </div>
          )}
        </div>

        {/* Donor list */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Nearby Donors</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : nearbyDonors.length === 0 ? (
            <EmptyState icon={<Droplet className="h-6 w-6" />} title="No donors nearby" subtitle="Try increasing the radius or changing the blood group filter." />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {nearbyDonors.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${
                    selected?.id === d.id
                      ? 'border-blood-300 bg-blood-50 dark:border-blood-700 dark:bg-blood-900/20'
                      : 'border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BloodDrop group={d.blood_group} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{d.full_name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Navigation className="h-3 w-3" /> {(d as any)._dist.toFixed(1)} km away
                      </p>
                    </div>
                    <AvailabilityBadge available={d.is_available} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected donor detail */}
      {selected && (
        <div className="card p-6 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <BloodDrop group={selected.blood_group} size="lg" />
              <div>
                <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">{selected.full_name}</h3>
                <p className="text-sm text-gray-500">{selected.address ?? 'Address not provided'}</p>
                <div className="mt-1 flex items-center gap-3">
                  <AvailabilityBadge available={selected.is_available} />
                  <span className="badge bg-blood-50 text-blood-700 dark:bg-blood-900/30 dark:text-blood-300">{selected.blood_group}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <a href={`tel:${selected.phone}`} className="text-blood-600 hover:underline">{selected.phone}</a>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4 text-gray-400" />
              {(selected as any)._dist?.toFixed(1)} km from you
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
