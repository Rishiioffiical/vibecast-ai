import React, { useState } from 'react';
import {
  Compass,
  Headphones,
  Maximize2,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  Waves,
  Zap,
} from 'lucide-react';

export type SpatialPreset = 'studio-booth' | 'spatial-atmos' | 'film-stage' | 'intimate-mic';

interface SpatialSoundstageProps {
  onSpatialChange?: (settings: {
    pan: number;
    depth: number;
    elevation: number;
    preset: SpatialPreset;
  }) => void;
  accentColor?: string;
}

export const SpatialSoundstage: React.FC<SpatialSoundstageProps> = ({
  onSpatialChange,
  accentColor = '#38BDF8',
}) => {
  const [pan, setPan] = useState<number>(0); // -1 to +1
  const [depth, setDepth] = useState<number>(65); // 0 to 100%
  const [elevation, setElevation] = useState<number>(50); // 0 to 100%
  const [activePreset, setActivePreset] = useState<SpatialPreset>('spatial-atmos');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handlePanChange = (newPan: number) => {
    setPan(newPan);
    onSpatialChange?.({ pan: newPan, depth, elevation, preset: activePreset });
  };

  const handlePresetSelect = (preset: SpatialPreset) => {
    setActivePreset(preset);
    let p = 0;
    let d = 65;
    let e = 50;

    if (preset === 'studio-booth') {
      p = 0;
      d = 30;
      e = 40;
    } else if (preset === 'spatial-atmos') {
      p = 0.15;
      d = 85;
      e = 70;
    } else if (preset === 'film-stage') {
      p = 0;
      d = 95;
      e = 80;
    } else if (preset === 'intimate-mic') {
      p = -0.05;
      d = 20;
      e = 30;
    }

    setPan(p);
    setDepth(d);
    setElevation(e);
    onSpatialChange?.({ pan: p, depth: d, elevation: e, preset });
  };

  // Calculate coordinates for the floating beacon on the circular soundstage radar
  // Pan maps to X axis (-1 to +1 -> 15% to 85%), Depth maps to Y axis (0 to 100% -> 80% to 20%)
  const beaconX = 50 + pan * 36;
  const beaconY = 82 - (depth / 100) * 58;

  return (
    <div className="spatial-glass-interactive rounded-3xl p-4 sm:p-5 border border-white/15 relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold-italic text-sm text-white">Spatial Soundstage</span>
              <span className="text-[9px] uppercase font-mono-numbers px-2 py-0.5 rounded-full bg-white/10 text-white font-bold border border-white/15">
                3D Binaural
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              Interactive 3D acoustic perspective and room depth
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs text-white/70 hover:text-white px-2.5 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Sliders className="w-3 h-3" />
          <span>{isExpanded ? 'Less' : 'Acoustics'}</span>
        </button>
      </div>

      {/* Preset Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {[
          { id: 'studio-booth' as SpatialPreset, name: 'Studio Booth', desc: 'Intimate' },
          { id: 'spatial-atmos' as SpatialPreset, name: 'Spatial Atmos', desc: 'Binaural 3D' },
          { id: 'film-stage' as SpatialPreset, name: 'Film Stage', desc: 'Cinematic' },
          { id: 'intimate-mic' as SpatialPreset, name: 'Direct Mic', desc: 'Zero Reverb' },
        ].map((item) => {
          const isSelected = activePreset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePresetSelect(item.id)}
              className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-white/15 border-white/30 text-white shadow-sm'
                  : 'bg-black/20 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="text-[11px] font-bold truncate flex items-center justify-between">
                <span>{item.name}</span>
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </div>
              <div className="text-[9px] opacity-75">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Soundstage Radar Visualizer */}
      <div className="relative w-full h-40 sm:h-44 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
        {/* Concentric Radar Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full border border-white/10" />
          <div className="w-36 h-36 rounded-full border border-white/10" />
          <div className="w-52 h-52 rounded-full border border-white/5" />
          {/* Subtle Soundstage Wave Ripples */}
          <div
            className="w-28 h-28 rounded-full border border-dashed opacity-30 animate-soundstage-wave"
            style={{ borderColor: accentColor }}
          />
        </div>

        {/* Center Crosshair & Listener Position */}
        <div className="absolute bottom-4 flex flex-col items-center">
          <div className="w-7 h-7 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white shadow-md">
            <Headphones className="w-3.5 h-3.5" />
          </div>
          <span className="text-[9px] uppercase font-mono-numbers text-white/50 font-bold mt-1">
            Listener (You)
          </span>
        </div>

        {/* Floating Sound Source Beacon in Z-Space */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing transition-all duration-300"
          style={{
            left: `${beaconX}%`,
            top: `${beaconY}%`,
          }}
        >
          {/* Glowing Beacon Aura */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg relative"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 20px ${accentColor}`,
            }}
          >
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ backgroundColor: accentColor }}
            />
          </div>
          <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-full mt-1 border border-white/20 whitespace-nowrap shadow-xs">
            {pan < -0.1 ? 'Left' : pan > 0.1 ? 'Right' : 'Center'} · {depth}% Depth
          </span>
        </div>

        {/* Axis Labels */}
        <div className="absolute top-2 left-3 text-[10px] font-mono-numbers text-white/40">
          -100% L
        </div>
        <div className="absolute top-2 right-3 text-[10px] font-mono-numbers text-white/40">
          +100% R
        </div>
        <div className="absolute top-2 text-[10px] font-mono-numbers text-white/40">
          Far Distance
        </div>
      </div>

      {/* Interactive Sliders (When Expanded or Quick Pan) */}
      <div className="space-y-2.5 pt-1">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-white/80 font-mono-numbers">
            <span className="flex items-center gap-1 font-semibold">
              <Waves className="w-3 h-3" />
              <span>Spatial Stereo Pan</span>
            </span>
            <span className="font-bold">
              {pan === 0 ? 'Center (0%)' : pan < 0 ? `Left ${Math.round(Math.abs(pan) * 100)}%` : `Right ${Math.round(pan * 100)}%`}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={pan}
            onChange={(e) => handlePanChange(parseFloat(e.target.value))}
            className="w-full h-1.5"
          />
        </div>

        {isExpanded && (
          <>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-white/80 font-mono-numbers">
                <span className="flex items-center gap-1 font-semibold">
                  <Maximize2 className="w-3 h-3" />
                  <span>Acoustic Room Depth</span>
                </span>
                <span className="font-bold">{depth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={depth}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setDepth(val);
                  onSpatialChange?.({ pan, depth: val, elevation, preset: activePreset });
                }}
                className="w-full h-1.5"
              />
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-white/80 font-mono-numbers">
                <span className="flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3" />
                  <span>Vocal Presence & Elevation</span>
                </span>
                <span className="font-bold">{elevation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={elevation}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setElevation(val);
                  onSpatialChange?.({ pan, depth, elevation: val, preset: activePreset });
                }}
                className="w-full h-1.5"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
