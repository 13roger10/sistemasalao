"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  User,
  Bell,
  Palette,
  Shield,
  Smartphone,
  Globe,
  Save,
  Camera,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    scheduleReminders: boolean;
    weeklyReport: boolean;
  };
  preferences: {
    theme: ThemeMode;
    language: string;
    defaultPlatform: "instagram" | "facebook" | "both";
    autoSaveDrafts: boolean;
  };
  profile: {
    name: string;
    email: string;
    businessName: string;
    phone: string;
  };
}

const SETTINGS_KEY = "social_studio_settings";

const defaultSettings: UserSettings = {
  notifications: {
    email: true,
    push: true,
    scheduleReminders: true,
    weeklyReport: false,
  },
  preferences: {
    theme: "light",
    language: "pt-BR",
    defaultPlatform: "both",
    autoSaveDrafts: true,
  },
  profile: {
    name: "",
    email: "",
    businessName: "",
    phone: "",
  },
};

const THEME_KEY = "social_studio_theme";

export default function SettingsPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { refreshSettings } = useSettings();
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "preferences" | "security">("profile");
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar configuracoes uma vez na montagem
  useEffect(() => {
    // Carregar tema diretamente do localStorage do ThemeContext
    const savedTheme = (localStorage.getItem(THEME_KEY) as ThemeMode) || "light";

    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({
          ...defaultSettings,
          ...parsed,
          preferences: {
            ...defaultSettings.preferences,
            ...parsed.preferences,
            // Usar o tema salvo no ThemeContext
            theme: savedTheme,
          },
          profile: {
            ...defaultSettings.profile,
            ...parsed.profile,
            name: user?.name || parsed.profile?.name || "",
            email: user?.email || parsed.profile?.email || "",
          },
        });
      } catch {
        // Ignora erro
      }
    } else {
      setSettings((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          theme: savedTheme,
        },
        profile: {
          ...prev.profile,
          name: user?.name || "",
          email: user?.email || "",
        },
      }));
    }
  }, [user]);

  // Salvar configuracoes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Atualizar titulo da aplicacao com o nome do negocio
      const businessName = settings.profile.businessName;
      if (businessName && businessName.trim()) {
        document.title = businessName;
      } else {
        document.title = "Social Studio IA";
      }

      // Disparar evento para atualizar o titulo em toda a aplicacao
      window.dispatchEvent(new Event("titleUpdate"));

      // Atualizar contexto global de settings
      refreshSettings();

      success("Configuracoes salvas!", "Suas preferencias foram atualizadas");
      setHasChanges(false);
    } catch {
      showError("Erro ao salvar", "Tente novamente");
    } finally {
      setIsSaving(false);
    }
  };

  // Atualizar configuracao
  const updateSettings = <K extends keyof UserSettings>(
    category: K,
    key: keyof UserSettings[K],
    value: UserSettings[K][keyof UserSettings[K]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const tabs = [
    { id: "profile" as const, label: "Perfil", icon: User },
    { id: "notifications" as const, label: "Notificacoes", icon: Bell },
    { id: "preferences" as const, label: "Preferencias", icon: Palette },
    { id: "security" as const, label: "Seguranca", icon: Shield },
  ];

  return (
    <AdminLayout title="Configuracoes">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuracoes</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Gerencie suas preferencias e configuracoes da conta
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-2 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
          {/* Perfil */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informacoes do Perfil</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Atualize suas informacoes pessoais e de contato
                </p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-2xl font-bold text-white">
                    {settings.profile.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-110 dark:bg-gray-700">
                    <Camera className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Foto de Perfil</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG ou GIF. Max 2MB</p>
                </div>
              </div>

              {/* Form */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={settings.profile.name}
                    onChange={(e) => updateSettings("profile", "name", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => updateSettings("profile", "email", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Negocio
                  </label>
                  <input
                    type="text"
                    value={settings.profile.businessName}
                    onChange={(e) => updateSettings("profile", "businessName", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="Seu salao/negocio"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Este nome sera exibido como titulo da aplicacao
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={settings.profile.phone}
                    onChange={(e) => updateSettings("profile", "phone", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notificacoes */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notificacoes</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure como e quando deseja receber notificacoes
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Notificacoes por Email</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receba atualizacoes por email</p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => updateSettings("notifications", "email", e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:after:border-gray-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Notificacoes Push</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Notificacoes no navegador/app</p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push}
                      onChange={(e) => updateSettings("notifications", "push", e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:after:border-gray-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Lembretes de Agendamento</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Lembre-me antes de posts agendados</p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.scheduleReminders}
                      onChange={(e) => updateSettings("notifications", "scheduleReminders", e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:after:border-gray-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Relatorio Semanal</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Resumo semanal de atividades</p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications.weeklyReport}
                      onChange={(e) => updateSettings("notifications", "weeklyReport", e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:after:border-gray-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Preferencias */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preferencias</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Personalize sua experiencia no aplicativo
                </p>
              </div>

              {/* Tema */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tema
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light" as const, label: "Claro", icon: Sun },
                    { value: "dark" as const, label: "Escuro", icon: Moon },
                    { value: "system" as const, label: "Sistema", icon: Monitor },
                  ].map((theme) => {
                    const Icon = theme.icon;
                    return (
                      <button
                        key={theme.value}
                        onClick={() => {
                          updateSettings("preferences", "theme", theme.value);
                          // Aplicar tema imediatamente para feedback visual
                          setTheme(theme.value);
                        }}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                          settings.preferences.theme === theme.value
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            settings.preferences.theme === theme.value
                              ? "text-violet-600 dark:text-violet-400"
                              : "text-gray-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            settings.preferences.theme === theme.value
                              ? "text-violet-700 dark:text-violet-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {theme.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Idioma */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Idioma
                </label>
                <select
                  value={settings.preferences.language}
                  onChange={(e) => updateSettings("preferences", "language", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="pt-BR">Portugues (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es">Espanol</option>
                </select>
              </div>

              {/* Plataforma Padrao */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Plataforma Padrao
                </label>
                <select
                  value={settings.preferences.defaultPlatform}
                  onChange={(e) =>
                    updateSettings("preferences", "defaultPlatform", e.target.value as "instagram" | "facebook" | "both")
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="both">Instagram + Facebook</option>
                  <option value="instagram">Apenas Instagram</option>
                  <option value="facebook">Apenas Facebook</option>
                </select>
              </div>

              {/* Auto-salvar */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Salvar rascunhos automaticamente</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Salva seu trabalho a cada 30 segundos</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.preferences.autoSaveDrafts}
                    onChange={(e) => updateSettings("preferences", "autoSaveDrafts", e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:after:border-gray-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Seguranca */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Seguranca</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gerencie a seguranca da sua conta
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Alterar Senha</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Atualize sua senha de acesso</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Alterar
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Autenticacao em Dois Fatores</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Adicione uma camada extra de seguranca</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Sessoes Ativas</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie dispositivos conectados</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver Sessoes
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-400">Excluir Conta</p>
                      <p className="text-sm text-red-600 dark:text-red-500">Esta acao e irreversivel</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="sticky bottom-4 flex justify-end">
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alteracoes
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
