'use client';

import { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Type,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';

type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

interface AppearanceSettings {
  theme: ThemeMode;
  primaryColor: string;
  fontSize: FontSize;
  reducedMotion: boolean;
  compactMode: boolean;
}

const defaultSettings: AppearanceSettings = {
  theme: 'system',
  primaryColor: '#8b5cf6', // violet-500
  fontSize: 'medium',
  reducedMotion: false,
  compactMode: false,
};

const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun className="h-5 w-5" /> },
  { value: 'dark', label: 'Escuro', icon: <Moon className="h-5 w-5" /> },
  { value: 'system', label: 'Sistema', icon: <Monitor className="h-5 w-5" /> },
];

const colorOptions = [
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
];

const fontSizeOptions: { value: FontSize; label: string; scale: string }[] = [
  { value: 'small', label: 'Pequeno', scale: '14px' },
  { value: 'medium', label: 'Medio', scale: '16px' },
  { value: 'large', label: 'Grande', scale: '18px' },
];

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
}

function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative flex-shrink-0 rounded-full transition-colors',
        enabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
      )}
      style={{ width: '44px', height: '24px' }}
    >
      <span
        className="absolute rounded-full bg-white shadow-md transition-transform duration-200"
        style={{
          width: '18px',
          height: '18px',
          top: '3px',
          left: '3px',
          transform: enabled ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

export default function AppearancePage() {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('appearance_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch {
        console.error('Error parsing appearance settings');
      }
    }

    // Apply initial theme
    applyTheme(settings.theme);
  }, []);

  // Apply theme changes
  const applyTheme = (theme: ThemeMode) => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Apply primary color
  const applyPrimaryColor = (color: string) => {
    document.documentElement.style.setProperty('--color-primary', color);
  };

  // Apply font size
  const applyFontSize = (size: FontSize) => {
    const root = document.documentElement;
    const scale = fontSizeOptions.find(f => f.value === size)?.scale || '16px';
    root.style.fontSize = scale;
  };

  const handleChange = (updates: Partial<AppearanceSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setHasChanges(true);
    setSaveSuccess(false);

    // Apply changes immediately for preview
    if (updates.theme) {
      applyTheme(updates.theme);
    }
    if (updates.primaryColor) {
      applyPrimaryColor(updates.primaryColor);
    }
    if (updates.fontSize) {
      applyFontSize(updates.fontSize);
    }
  };

  const handleSave = () => {
    localStorage.setItem('appearance_settings', JSON.stringify(settings));
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('appearance_settings');
    applyTheme(defaultSettings.theme);
    applyPrimaryColor(defaultSettings.primaryColor);
    applyFontSize(defaultSettings.fontSize);
    setHasChanges(false);
  };

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
              <Palette className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Aparencia
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Personalize cores e tema do sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="text-sm">Salvo</span>
              </div>
            )}
            {hasChanges && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                <Save className="h-4 w-4" />
                Salvar
              </button>
            )}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">Tema</h3>
          </div>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Escolha o tema de cores do sistema
          </p>

          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleChange({ theme: option.value })}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
                  settings.theme === option.value
                    ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600'
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full',
                    settings.theme === option.value
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                  )}
                >
                  {option.icon}
                </div>
                <span
                  className={cn(
                    'font-medium',
                    settings.theme === option.value
                      ? 'text-violet-900 dark:text-violet-300'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {option.label}
                </span>
                {settings.theme === option.value && (
                  <Check className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Color */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-violet-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">Cor Principal</h3>
          </div>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Escolha a cor de destaque do sistema
          </p>

          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {colorOptions.map(color => (
              <button
                key={color.value}
                onClick={() => handleChange({ primaryColor: color.value })}
                className={cn(
                  'group relative flex h-12 w-full items-center justify-center rounded-lg border-2 transition-all',
                  settings.primaryColor === color.value
                    ? 'border-gray-900 dark:border-white'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {settings.primaryColor === color.value && (
                  <Check className="h-5 w-5 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>

          {/* Custom color picker */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">Cor personalizada:</label>
            <input
              type="color"
              value={settings.primaryColor}
              onChange={e => handleChange({ primaryColor: e.target.value })}
              className="h-10 w-20 cursor-pointer rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {settings.primaryColor.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Font Size */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Type className="h-5 w-5 text-blue-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">Tamanho da Fonte</h3>
          </div>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Ajuste o tamanho do texto no sistema
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const idx = fontSizeOptions.findIndex(f => f.value === settings.fontSize);
                if (idx > 0) {
                  handleChange({ fontSize: fontSizeOptions[idx - 1].value });
                }
              }}
              disabled={settings.fontSize === 'small'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              <Minus className="h-4 w-4" />
            </button>

            <div className="flex flex-1 gap-2">
              {fontSizeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleChange({ fontSize: option.value })}
                  className={cn(
                    'flex-1 rounded-lg border-2 px-4 py-3 text-center font-medium transition-all',
                    settings.fontSize === option.value
                      ? 'border-violet-500 bg-violet-50 text-violet-900 dark:border-violet-400 dark:bg-violet-900/20 dark:text-violet-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  <span style={{ fontSize: option.scale }}>{option.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const idx = fontSizeOptions.findIndex(f => f.value === settings.fontSize);
                if (idx < fontSizeOptions.length - 1) {
                  handleChange({ fontSize: fontSizeOptions[idx + 1].value });
                }
              }}
              disabled={settings.fontSize === 'large'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Additional Options */}
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Reduzir Animacoes</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Desativa animacoes para melhor acessibilidade
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.reducedMotion}
              onChange={() => handleChange({ reducedMotion: !settings.reducedMotion })}
            />
          </div>

          {/* Compact Mode */}
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Modo Compacto</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Reduz espacamento para mostrar mais conteudo
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.compactMode}
              onChange={() => handleChange({ compactMode: !settings.compactMode })}
            />
          </div>
        </div>

        {/* Preview Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 font-medium text-gray-900 dark:text-white">Preview</h3>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: settings.primaryColor + '20' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: settings.primaryColor }}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Exemplo de Componente
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Veja como as cores aparecem no sistema
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Botao Primario
              </button>
              <button
                className="rounded-lg border px-4 py-2 text-sm font-medium"
                style={{ borderColor: settings.primaryColor, color: settings.primaryColor }}
              >
                Botao Secundario
              </button>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center pb-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrao
          </button>
        </div>
      </div>
    </SalonLayout>
  );
}
