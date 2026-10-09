import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId =
  | 'forest-sage'
  | 'midnight-obsidian'
  | 'royal-amber'
  | 'nordic-indigo'
  | 'kashmir-rose';

export type FontId =
  | 'editorial-serif'
  | 'modern-sans'
  | 'hindi-devanagari'
  | 'cinematic-bold'
  | 'studio-mono';

export type EditorFontSize = 'normal' | 'large' | 'huge';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  hindiName: string;
  subtitle: string;
  canvasBg: string;
  cardBg: string;
  cardBorder: string;
  glassBg: string;
  glassBorder: string;
  spatialGlow: string;
  soundstageColor: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  tagBg: string;
  isDark: boolean;
  swatchColors: [string, string, string]; // [canvas, glass, accent]
  orbColors: [string, string, string];    // [primary aura, secondary aura, ambient light]
}

export interface FontConfig {
  id: FontId;
  name: string;
  hindiName: string;
  subtitle: string;
  fontFamily: string;
  headingClass: string;
  editorClass: string;
  sampleHindi: string;
  sampleEnglish: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'forest-sage',
    name: 'Spatial Emerald Sage',
    hindiName: 'स्पेशियल एमराल्ड सेज',
    subtitle: 'Frosted Emerald Acrylic & Bioluminescent Mint',
    canvasBg: '#111813',
    cardBg: 'rgba(23, 36, 28, 0.78)',
    cardBorder: 'rgba(134, 186, 150, 0.22)',
    glassBg: 'rgba(28, 44, 34, 0.65)',
    glassBorder: 'rgba(180, 225, 195, 0.25)',
    spatialGlow: 'rgba(56, 217, 169, 0.25)',
    soundstageColor: '#38D9A9',
    inputBg: 'rgba(14, 22, 17, 0.7)',
    textPrimary: '#F3FAF5',
    textSecondary: '#9CB7A2',
    accent: '#E65C6E',
    accentHover: '#D44759',
    accentLight: 'rgba(230, 92, 110, 0.2)',
    tagBg: 'rgba(56, 217, 169, 0.15)',
    isDark: true,
    swatchColors: ['#111813', '#23382B', '#E65C6E'],
    orbColors: ['rgba(56, 217, 169, 0.25)', 'rgba(230, 92, 110, 0.2)', 'rgba(240, 192, 90, 0.15)'],
  },
  {
    id: 'midnight-obsidian',
    name: 'VisionOS Obsidian',
    hindiName: 'विज़नओएस ऑब्सिडियन',
    subtitle: 'Deep Void Spatial Glass & Cyan Ion Beam',
    canvasBg: '#080C0F',
    cardBg: 'rgba(15, 21, 28, 0.78)',
    cardBorder: 'rgba(255, 255, 255, 0.16)',
    glassBg: 'rgba(19, 27, 36, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.22)',
    spatialGlow: 'rgba(56, 189, 248, 0.28)',
    soundstageColor: '#38BDF8',
    inputBg: 'rgba(10, 14, 19, 0.7)',
    textPrimary: '#F1F6FB',
    textSecondary: '#8DA4B6',
    accent: '#38BDF8',
    accentHover: '#0EA5E9',
    accentLight: 'rgba(56, 189, 248, 0.2)',
    tagBg: 'rgba(56, 189, 248, 0.15)',
    isDark: true,
    swatchColors: ['#080C0F', '#15212C', '#38BDF8'],
    orbColors: ['rgba(56, 189, 248, 0.28)', 'rgba(168, 85, 247, 0.22)', 'rgba(59, 130, 246, 0.2)'],
  },
  {
    id: 'royal-amber',
    name: 'Solar Amber Spatial',
    hindiName: 'सोलर अंबर स्पेशल',
    subtitle: 'Smoked Honey Glass & Golden Acoustic Bloom',
    canvasBg: '#150E09',
    cardBg: 'rgba(32, 21, 14, 0.78)',
    cardBorder: 'rgba(245, 170, 95, 0.22)',
    glassBg: 'rgba(38, 25, 17, 0.65)',
    glassBorder: 'rgba(251, 191, 36, 0.25)',
    spatialGlow: 'rgba(245, 158, 11, 0.28)',
    soundstageColor: '#F59E0B',
    inputBg: 'rgba(20, 13, 8, 0.7)',
    textPrimary: '#FDF7EE',
    textSecondary: '#BFA287',
    accent: '#F59E0B',
    accentHover: '#D97706',
    accentLight: 'rgba(245, 158, 11, 0.2)',
    tagBg: 'rgba(245, 158, 11, 0.15)',
    isDark: true,
    swatchColors: ['#150E09', '#2E1E13', '#F59E0B'],
    orbColors: ['rgba(245, 158, 11, 0.28)', 'rgba(239, 68, 68, 0.18)', 'rgba(251, 191, 36, 0.2)'],
  },
  {
    id: 'nordic-indigo',
    name: 'Nordic Cobalt Stage',
    hindiName: 'नॉर्डिक कोबाल्ट स्टेज',
    subtitle: 'Stratospheric Frosted Navy & Laser Blue Rim',
    canvasBg: '#090F1C',
    cardBg: 'rgba(16, 26, 48, 0.78)',
    cardBorder: 'rgba(147, 197, 253, 0.22)',
    glassBg: 'rgba(20, 32, 60, 0.65)',
    glassBorder: 'rgba(191, 219, 254, 0.25)',
    spatialGlow: 'rgba(96, 165, 250, 0.3)',
    soundstageColor: '#60A5FA',
    inputBg: 'rgba(10, 16, 30, 0.7)',
    textPrimary: '#F2F6FC',
    textSecondary: '#97A9C5',
    accent: '#60A5FA',
    accentHover: '#3B82F6',
    accentLight: 'rgba(96, 165, 250, 0.2)',
    tagBg: 'rgba(96, 165, 250, 0.15)',
    isDark: true,
    swatchColors: ['#090F1C', '#162444', '#60A5FA'],
    orbColors: ['rgba(59, 130, 246, 0.3)', 'rgba(129, 140, 248, 0.22)', 'rgba(56, 189, 248, 0.2)'],
  },
  {
    id: 'kashmir-rose',
    name: 'Cosmic Nebula Glass',
    hindiName: 'कॉस्मिक नेबुला ग्लास',
    subtitle: 'Ultraviolet Acrylic & Shimmering Rose Quartz',
    canvasBg: '#140A18',
    cardBg: 'rgba(28, 14, 34, 0.78)',
    cardBorder: 'rgba(244, 114, 182, 0.22)',
    glassBg: 'rgba(36, 18, 44, 0.65)',
    glassBorder: 'rgba(249, 168, 212, 0.25)',
    spatialGlow: 'rgba(244, 114, 182, 0.28)',
    soundstageColor: '#F472B6',
    inputBg: 'rgba(18, 9, 22, 0.7)',
    textPrimary: '#FDF3F8',
    textSecondary: '#BC9DB5',
    accent: '#F472B6',
    accentHover: '#EC4899',
    accentLight: 'rgba(244, 114, 182, 0.2)',
    tagBg: 'rgba(244, 114, 182, 0.15)',
    isDark: true,
    swatchColors: ['#140A18', '#271330', '#F472B6'],
    orbColors: ['rgba(192, 38, 211, 0.28)', 'rgba(244, 114, 182, 0.22)', 'rgba(147, 51, 234, 0.22)'],
  },
];

export const FONTS: FontConfig[] = [
  {
    id: 'editorial-serif',
    name: 'Spatial Editorial Serif',
    hindiName: 'स्पेशियल शेरीफ',
    subtitle: 'Poetic, expressive & literary cadence with high legibility',
    fontFamily: "'Playfair Display', 'Fraunces', Georgia, serif",
    headingClass: "font-['Fraunces',serif]",
    editorClass: "font-['Playfair_Display',Georgia,serif]",
    sampleHindi: 'खामोशियों की भी अपनी इक ज़ुबान होती है...',
    sampleEnglish: 'Every silence has an unspoken story.',
  },
  {
    id: 'modern-sans',
    name: 'Vision Modern Sans',
    hindiName: 'विज़न मॉडर्न सैन्स',
    subtitle: 'Crisp, contemporary & high clarity spatial UI',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    headingClass: "font-['Plus_Jakarta_Sans',sans-serif]",
    editorClass: "font-['Plus_Jakarta_Sans',sans-serif]",
    sampleHindi: 'साफ, आधुनिक और सहज हिंदी उच्चारण।',
    sampleEnglish: 'Clear, modern voiceover and narration.',
  },
  {
    id: 'hindi-devanagari',
    name: 'Devanagari Sahitya',
    hindiName: 'देवनागरी साहित्य',
    subtitle: 'Authentic Indian kavita & drama typography',
    fontFamily: "'Noto Sans Devanagari', 'Rozha One', serif",
    headingClass: "font-['Rozha_One','Noto_Sans_Devanagari',serif]",
    editorClass: "font-['Noto_Sans_Devanagari',sans-serif]",
    sampleHindi: 'शायराना अंदाज और दिल को छू जाने वाली मिठास।',
    sampleEnglish: 'Pure poetic Devanagari expression.',
  },
  {
    id: 'cinematic-bold',
    name: 'Cinematic Display',
    hindiName: 'सिनेमैटिक बोल्ड',
    subtitle: 'Dramatic, theatrical & commanding impact',
    fontFamily: "'Syne', 'Fraunces', sans-serif",
    headingClass: "font-['Syne',sans-serif]",
    editorClass: "font-['Syne',sans-serif]",
    sampleHindi: 'दमदार और प्रभावशाली संवाद अदायगी!',
    sampleEnglish: 'Commanding theatrical voice presence.',
  },
  {
    id: 'studio-mono',
    name: 'Studio Screenplay',
    hindiName: 'स्टूडियो स्क्रीनप्ले',
    subtitle: 'Typewriter radio drama & screenplay script',
    fontFamily: "'Space Mono', 'Space Grotesk', monospace",
    headingClass: "font-['Space_Grotesk',monospace]",
    editorClass: "font-['Space_Mono',monospace]",
    sampleHindi: 'रेडियो नाटक और स्क्रिप्ट ड्राफ्टिंग स्टाइल।',
    sampleEnglish: 'SCENE 1: Studio narration at 24fps.',
  },
];

interface ThemeContextType {
  currentThemeId: ThemeId;
  currentTheme: ThemeConfig;
  setTheme: (id: ThemeId) => void;
  currentFontId: FontId;
  currentFont: FontConfig;
  setFont: (id: FontId) => void;
  editorFontSize: EditorFontSize;
  setEditorFontSize: (size: EditorFontSize) => void;
  themes: ThemeConfig[];
  fonts: FontConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('vibecast_theme') as ThemeId;
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    } catch (e) {}
    return 'forest-sage';
  });

  const [currentFontId, setCurrentFontId] = useState<FontId>(() => {
    try {
      const saved = localStorage.getItem('vibecast_font') as FontId;
      if (saved && FONTS.some((f) => f.id === saved)) return saved;
    } catch (e) {}
    return 'editorial-serif';
  });

  const [editorFontSize, setEditorFontSizeState] = useState<EditorFontSize>(() => {
    try {
      const saved = localStorage.getItem('vibecast_font_size') as EditorFontSize;
      if (saved && ['normal', 'large', 'huge'].includes(saved)) return saved;
    } catch (e) {}
    return 'large';
  });

  const currentTheme = THEMES.find((t) => t.id === currentThemeId) || THEMES[0];
  const currentFont = FONTS.find((f) => f.id === currentFontId) || FONTS[0];

  const setTheme = (id: ThemeId) => {
    setCurrentThemeId(id);
    try {
      localStorage.setItem('vibecast_theme', id);
    } catch (e) {}
  };

  const setFont = (id: FontId) => {
    setCurrentFontId(id);
    try {
      localStorage.setItem('vibecast_font', id);
    } catch (e) {}
  };

  const setEditorFontSize = (size: EditorFontSize) => {
    setEditorFontSizeState(size);
    try {
      localStorage.setItem('vibecast_font_size', size);
    } catch (e) {}
  };

  // Synchronize CSS custom properties and body attributes for Spatial UI
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--canvas-bg', currentTheme.canvasBg);
    root.style.setProperty('--card-bg', currentTheme.cardBg);
    root.style.setProperty('--card-border', currentTheme.cardBorder);
    root.style.setProperty('--glass-bg', currentTheme.glassBg);
    root.style.setProperty('--glass-border', currentTheme.glassBorder);
    root.style.setProperty('--spatial-glow', currentTheme.spatialGlow);
    root.style.setProperty('--soundstage-color', currentTheme.soundstageColor);
    root.style.setProperty('--input-bg', currentTheme.inputBg);
    root.style.setProperty('--text-primary', currentTheme.textPrimary);
    root.style.setProperty('--text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--accent-color', currentTheme.accent);
    root.style.setProperty('--accent-hover', currentTheme.accentHover);
    root.style.setProperty('--accent-light', currentTheme.accentLight);
    root.style.setProperty('--tag-bg', currentTheme.tagBg);

    document.body.style.backgroundColor = currentTheme.canvasBg;

    if (currentTheme.isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme-mode', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme-mode', 'light');
    }

    root.setAttribute('data-theme', currentTheme.id);
    root.setAttribute('data-font', currentFont.id);
  }, [currentTheme, currentFont]);

  return (
    <ThemeContext.Provider
      value={{
        currentThemeId,
        currentTheme,
        setTheme,
        currentFontId,
        currentFont,
        setFont,
        editorFontSize,
        setEditorFontSize,
        themes: THEMES,
        fonts: FONTS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
