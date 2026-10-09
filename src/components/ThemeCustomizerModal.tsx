import React from 'react';
import {
  Palette,
  Type,
  Check,
  X,
  Sparkles,
  Sun,
  Moon,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { useTheme, ThemeId, FontId, EditorFontSize } from '../contexts/ThemeContext';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentThemeId,
    currentTheme,
    setTheme,
    currentFontId,
    currentFont,
    setFont,
    editorFontSize,
    setEditorFontSize,
    themes,
    fonts,
  } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[36px] spatial-glass border border-white/20 shadow-2xl p-5 sm:p-7 space-y-6 animate-in zoom-in-95 relative"
        style={{
          color: currentTheme.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DFD6C7]/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: currentTheme.accent,
                color: '#ffffff',
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>Studio Appearance</span>
                <span
                  className="text-xs uppercase font-syne font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: currentTheme.tagBg,
                    color: currentTheme.accent,
                  }}
                >
                  थीम व फॉन्ट
                </span>
              </h3>
              <p
                className="text-xs"
                style={{ color: currentTheme.textSecondary }}
              >
                Customize color atmosphere and script reading typography
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: currentTheme.inputBg,
              color: currentTheme.textSecondary,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Themes Gallery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider font-syne flex items-center gap-1.5"
              style={{ color: currentTheme.accent }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Color Themes (5 Studio Palettes)</span>
            </span>
            <span
              className="text-xs"
              style={{ color: currentTheme.textSecondary }}
            >
              Active:{' '}
              <strong className="font-semibold">{currentTheme.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {themes.map((th) => {
              const isSelected = th.id === currentThemeId;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'ring-2 shadow-md scale-[1.01]'
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: th.cardBg,
                    borderColor: isSelected ? th.accent : th.cardBorder,
                    color: th.textPrimary,
                  }}
                >
                  {/* Top Bar: Color Swatches & Mode Tag */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/10 backdrop-blur-xs">
                      {th.swatchColors.map((color, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/20 shadow-2xs"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{
                          backgroundColor: th.tagBg,
                          color: th.accent,
                        }}
                      >
                        {th.isDark ? (
                          <Moon className="w-2.5 h-2.5" />
                        ) : (
                          <Sun className="w-2.5 h-2.5" />
                        )}
                        <span>{th.isDark ? 'Dark' : 'Light'}</span>
                      </span>

                      {isSelected && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: th.accent }}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-sm">{th.name}</span>
                      <span
                        className="text-xs"
                        style={{ color: th.textSecondary }}
                      >
                        · {th.hindiName}
                      </span>
                    </div>
                    <p
                      className="text-[11px] line-clamp-1 mt-0.5"
                      style={{ color: th.textSecondary }}
                    >
                      {th.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Fonts & Typographic Persona */}
        <div className="space-y-3 pt-2 border-t border-[#DFD6C7]/50">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider font-syne flex items-center gap-1.5"
              style={{ color: currentTheme.accent }}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Script & Studio Font Persona</span>
            </span>
            <span
              className="text-xs"
              style={{ color: currentTheme.textSecondary }}
            >
              Active:{' '}
              <strong className="font-semibold">{currentFont.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {fonts.map((f) => {
              const isSelected = f.id === currentFontId;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'ring-2 shadow-md'
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: currentTheme.inputBg,
                    borderColor: isSelected
                      ? currentTheme.accent
                      : currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{f.name}</div>
                      <div
                        className="text-[11px]"
                        style={{ color: currentTheme.textSecondary }}
                      >
                        {f.hindiName} · {f.subtitle}
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: currentTheme.accent }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Live Font Sample */}
                  <div
                    className="p-2.5 rounded-xl border border-black/5 space-y-1"
                    style={{
                      backgroundColor: currentTheme.cardBg,
                      fontFamily: f.fontFamily,
                    }}
                  >
                    <p className="text-xs leading-relaxed line-clamp-1 italic font-medium">
                      "{f.sampleHindi}"
                    </p>
                    <p
                      className="text-[11px] line-clamp-1"
                      style={{ color: currentTheme.textSecondary }}
                    >
                      {f.sampleEnglish}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Script Editor Font Size */}
        <div className="space-y-3 pt-2 border-t border-[#DFD6C7]/50">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase tracking-wider font-syne flex items-center gap-1.5"
              style={{ color: currentTheme.accent }}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Script Editor Font Size</span>
            </span>
            <span
              className="text-xs font-mono-numbers"
              style={{ color: currentTheme.textSecondary }}
            >
              Current:{' '}
              {editorFontSize === 'normal'
                ? 'Standard (16px)'
                : editorFontSize === 'large'
                ? 'Large (18px)'
                : 'Pro Studio (22px)'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'normal' as EditorFontSize, label: 'Normal (16px)', desc: 'Compact view' },
              { id: 'large' as EditorFontSize, label: 'Large (18px)', desc: 'Recommended' },
              { id: 'huge' as EditorFontSize, label: 'Pro Studio (22px)', desc: 'Mic teleprompter' },
            ].map((size) => {
              const isSelected = editorFontSize === size.id;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setEditorFontSize(size.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'shadow-xs font-bold'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? currentTheme.accent
                      : currentTheme.inputBg,
                    borderColor: isSelected
                      ? currentTheme.accent
                      : currentTheme.cardBorder,
                    color: isSelected ? '#ffffff' : currentTheme.textPrimary,
                  }}
                >
                  <div className="text-xs font-bold">{size.label}</div>
                  <div
                    className="text-[10px] mt-0.5 opacity-80"
                  >
                    {size.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#DFD6C7]/50">
          <button
            type="button"
            onClick={() => {
              setTheme('forest-sage');
              setFont('editorial-serif');
              setEditorFontSize('large');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            style={{
              backgroundColor: currentTheme.inputBg,
              color: currentTheme.textSecondary,
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider text-white shadow-md transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: currentTheme.accent,
            }}
          >
            Done (सेव करें)
          </button>
        </div>
      </div>
    </div>
  );
};
