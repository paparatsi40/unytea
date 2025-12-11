// 🎨 UNYTEA DESIGN SYSTEM
// Complete design tokens for consistent, premium UI

export const designSystem = {
  // Color Palette - Premium & Modern
  colors: {
    // Primary brand colors
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6', // Main brand color
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#2e1065',
    },
    
    // Accent colors
    accent: {
      purple: '#a855f7',
      pink: '#ec4899',
      blue: '#3b82f6',
      green: '#10b981',
      amber: '#f59e0b',
      orange: '#f97316',
    },
    
    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Neutral colors
    dark: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },
  
  // Typography Scale
  typography: {
    fontFamily: {
      sans: 'var(--font-geist-sans)',
      mono: 'var(--font-geist-mono)',
    },
    
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
      '7xl': '4.5rem',   // 72px
      '8xl': '6rem',     // 96px
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    },
    
    lineHeight: {
      tight: 1.2,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  
  // Spacing Scale (consistent spacing throughout)
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
    '5xl': '8rem',   // 128px
  },
  
  // Border Radius
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    
    // Colored shadows for premium effect
    primary: '0 20px 25px -5px rgb(139 92 246 / 0.3)',
    success: '0 20px 25px -5px rgb(16 185 129 / 0.3)',
    warning: '0 20px 25px -5px rgb(245 158 11 / 0.3)',
    error: '0 20px 25px -5px rgb(239 68 68 / 0.3)',
  },
  
  // Animation Durations
  animation: {
    duration: {
      instant: '100ms',
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms',
      slowest: '1000ms',
    },
    
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      smooth: 'cubic-bezier(0.4, 0, 0.6, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      sharp: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
  
  // Gradients (Premium effects)
  gradients: {
    primary: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    sunset: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
    ocean: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    forest: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    fire: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    royal: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
    mesh: 'radial-gradient(at 50% 50%, rgba(139, 92, 246, 0.15), transparent 50%), radial-gradient(at 80% 20%, rgba(168, 85, 247, 0.15), transparent 50%)',
  },
  
  // Backdrop Blur
  blur: {
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(12px)',
    xl: 'blur(16px)',
    '2xl': 'blur(24px)',
  },
  
  // Z-index Scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
    toast: 1700,
  },
} as const;

// Helper function to get gradient classes
export const getGradientClass = (gradient: keyof typeof designSystem.gradients) => {
  const gradients = {
    primary: 'bg-gradient-to-br from-violet-500 to-purple-600',
    sunset: 'bg-gradient-to-br from-orange-500 to-pink-600',
    ocean: 'bg-gradient-to-br from-blue-500 to-violet-600',
    forest: 'bg-gradient-to-br from-green-500 to-blue-600',
    fire: 'bg-gradient-to-br from-amber-500 to-red-600',
    royal: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-600',
    mesh: 'bg-gradient-radial from-violet-500/15 to-transparent',
  };
  
  return gradients[gradient];
};

// Animation presets
export const animations = {
  fadeIn: 'animate-in fade-in duration-300',
  slideInFromBottom: 'animate-in slide-in-from-bottom-4 fade-in duration-500',
  slideInFromTop: 'animate-in slide-in-from-top-4 fade-in duration-500',
  slideInFromLeft: 'animate-in slide-in-from-left-4 fade-in duration-500',
  slideInFromRight: 'animate-in slide-in-from-right-4 fade-in duration-500',
  scaleIn: 'animate-in zoom-in fade-in duration-300',
  
  // Hover states
  hoverScale: 'transition-transform duration-300 hover:scale-105',
  hoverGlow: 'transition-shadow duration-300 hover:shadow-2xl',
  hoverLift: 'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
  
  // Interactive states
  active: 'active:scale-95 transition-transform duration-100',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
};

// Component presets
export const components = {
  card: {
    base: 'rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-lg',
    hover: 'transition-all duration-300 hover:shadow-2xl hover:border-primary/20',
    interactive: 'cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95',
  },
  
  button: {
    primary: 'rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-xl hover:shadow-violet-500/40 active:scale-95',
    secondary: 'rounded-xl border border-border bg-card px-6 py-3 font-semibold transition-all hover:bg-accent active:scale-95',
    ghost: 'rounded-xl px-6 py-3 font-semibold transition-all hover:bg-accent active:scale-95',
  },
  
  input: {
    base: 'rounded-xl border border-border bg-background/80 px-4 py-3 transition-all focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10',
  },
  
  badge: {
    primary: 'rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-600 dark:text-violet-400',
    success: 'rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400',
    warning: 'rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-400',
    error: 'rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400',
  },
};

export type DesignSystem = typeof designSystem;
