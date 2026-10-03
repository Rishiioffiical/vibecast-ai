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
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  tagBg: string;
  isDark: boolean;
  swatchColors: [string, string, string]; // [canvas, card, accent]
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
    name: 'Forest Sage',
    hindiName: 'वन सेज (मूल)',
    subtitle: 'Classic Retro-Editorial Studio',
    canvasBg: '#344638',
    cardBg: '#FAF7EF',
    cardBorder: '#DFD6C7',
    inputBg: '#F4EFE6',
    textPrimary: '#1F261F',
    textSecondary: '#5C6E60',
    accent: '#B83848',
    accentHover: '#9E2A3B',
    accentLight: '#B838481A',
    tagBg: '#2E4E3B14',
    isDark: false,
    swatchColors: ['#344638', '#FAF7EF', '#B83848'],
  },
  {
    id: 'midnight-obsidian',
    name: 'Midnight Dark',
    hindiName: 'मिडनाइट डार्क',
    subtitle: 'Cinematic Obsidian Studio',
    canvasBg: '#0F1412',
    cardBg: '#18221D',
    cardBorder: '#283830',
    inputBg: '#131B17',
    textPrimary: '#F1F7F3',
    textSecondary: '#8CA393',
    accent: '#E65C6E',
    accentHover: '#D44759',
    accentLight: '#E65C6E26',
    tagBg: '#38D9A920',
    isDark: true,
    swatchColors: ['#0F1412', '#18221D', '#E65C6E'],
  },
  {
    id: 'royal-amber',
    name: 'Royal Amber',
    hindiName: 'शाही अंबर व चाय',
    subtitle: 'Warm Terracotta & Saffron Parchment',
    canvasBg: '#382216',
    cardBg: '#FCF7EE',
    cardBorder: '#E2D1BE',
    inputBg: '#F5ECDE',
    textPrimary: '#26170E',
    textSecondary: '#7A5741',
    accent: '#C86227',
    accentHover: '#A94E1B',
    accentLight: '#C862271A',
    tagBg: '#59382218',
    isDark: false,
    swatchColors: ['#382216', '#FCF7EE', '#C86227'],
  },
  {
    id: 'nordic-indigo',
    name: 'Nordic Indigo',
    hindiName: 'नॉर्डिक इंडिगो',
    subtitle: 'Deep Acoustic Navy & Electric Cobalt',
    canvasBg: '#131D2D',
    cardBg: '#F7FAFC',
    cardBorder: '#CBD5E1',
    inputBg: '#EEF3F8',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    accentLight: '#2563EB1A',
    tagBg: '#0F172A14',
    isDark: false,
    swatchColors: ['#131D2D', '#F7FAFC', '#2563EB'],
  },
  {
    id: 'kashmir-rose',
    name: 'Kashmir Rose',
    hindiName: 'कश्मीर रोज़',
    subtitle: 'Soulful Ghazal & Velvet Mauve',
    canvasBg: '#2C1825',
    cardBg: '#FAF2F5',
    cardBorder: '#E6CFDC',
    inputBg: '#F3E5ED',
    textPrimary: '#24121F',
    textSecondary: '#754F6A',
    accent: '#B82858',
    accentHover: '#9C1E47',
    accentLight: '#B828581A',
    tagBg: '#3F1F3518',
    isDark: false,
    swatchColors: ['#2C1825', '#FAF2F5', '#B82858'],
  },
];

export const FONTS: FontConfig[] = [
  {
    id: 'editorial-serif',
    name: 'Editorial Serif',
    hindiName: 'क्लासिक शेरीफ',
    subtitle: 'Poetic, expressive & literary cadence',
    fontFamily: "'Playfair Display', 'Fraunces', Georgia, serif",
    headingClass: "font-['Fraunces',serif]",
    editorClass: "font-['Playfair_Display',Georgia,serif]",
    sampleHindi: 'खामोशियों की भी अपनी इक ज़ुबान होती है...',
    sampleEnglish: 'Every silence has an unspoken story.',
  },
  {
    id: 'modern-sans',
    name: 'Modern Sans',
    hindiName: 'मॉडर्न सैन्स',
    subtitle: 'Crisp, contemporary & high clarity',
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

  // Synchronize CSS custom properties and body attributes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--canvas-bg', currentTheme.canvasBg);
    root.style.setProperty('--card-bg', currentTheme.cardBg);
    root.style.setProperty('--card-border', currentTheme.cardBorder);
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
