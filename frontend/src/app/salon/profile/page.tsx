'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Save,
  Upload,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  Camera,
  Check,
  AlertCircle,
  Users,
  Calendar,
  Star,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';
import { businessService } from '@/services/salon/businessService';
import type { BusinessProfile, BusinessStats } from '@/types/salon/business';
import type { DaySchedule } from '@/types/salon/common';

const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

// Toggle component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
}

function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
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

// Input component
interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  mask?: 'phone' | 'cnpj' | 'cep';
}

function Input({ label, value, onChange, placeholder, type = 'text', icon, mask }: InputProps) {
  const formatValue = (val: string) => {
    if (!mask) return val;

    const digits = val.replace(/\D/g, '');

    if (mask === 'phone') {
      if (digits.length <= 10) {
        return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
      }
      return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
    }

    if (mask === 'cnpj') {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').trim();
    }

    if (mask === 'cep') {
      return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2').trim();
    }

    return val;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (mask) {
      val = formatValue(val);
    }
    onChange(val);
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900',
            'focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
            'dark:border-gray-600 dark:bg-gray-700 dark:text-white',
            icon && 'pl-10'
          )}
        />
      </div>
    </div>
  );
}

// Textarea component
interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }: TextareaProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900',
          'focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
          'dark:border-gray-600 dark:bg-gray-700 dark:text-white'
        )}
      />
    </div>
  );
}

export default function BusinessProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'address' | 'schedule' | 'social'>('info');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileData, statsData] = await Promise.all([
          businessService.get(),
          businessService.getStats(),
        ]);
        setProfile(profileData);
        setStats(statsData);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Erro ao carregar dados do negocio');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleChange = <K extends keyof BusinessProfile>(field: K, value: BusinessProfile[K]) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
    setHasChanges(true);
    setSaveSuccess(false);
    setError(null);
  };

  const handleAddressChange = (field: string, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      address: { ...profile.address, [field]: value },
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSocialChange = (platform: string, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      socialMedia: { ...profile.socialMedia, [platform]: value },
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleScheduleChange = (dayIndex: number, field: 'isOpen' | 'start' | 'end', value: boolean | string) => {
    if (!profile) return;

    const days = [...profile.schedule.days];
    const day = { ...days[dayIndex] };

    if (field === 'isOpen') {
      day.isOpen = value as boolean;
    } else if (day.timeRanges.length > 0) {
      day.timeRanges = [{ ...day.timeRanges[0], [field]: value }];
    } else {
      day.timeRanges = [{ start: '09:00', end: '18:00', [field]: value }];
    }

    days[dayIndex] = day;
    setProfile({ ...profile, schedule: { days } });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!profile || !hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await businessService.update({
        name: profile.name,
        tradeName: profile.tradeName,
        cnpj: profile.cnpj,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        email: profile.email,
        website: profile.website,
        address: profile.address,
        schedule: profile.schedule,
        description: profile.description,
        socialMedia: profile.socialMedia,
        primaryColor: profile.primaryColor,
      });
      setProfile(updated);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Erro ao salvar alteracoes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      const { url } = await businessService.uploadLogo(file);
      setProfile({ ...profile, logo: url });
      setHasChanges(true);
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Erro ao enviar logo');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      const { url } = await businessService.uploadCover(file);
      setProfile({ ...profile, coverImage: url });
      setHasChanges(true);
    } catch (err) {
      console.error('Error uploading cover:', err);
      setError('Erro ao enviar imagem de capa');
    }
  };

  const searchCep = async (cep: string) => {
    if (cep.replace(/\D/g, '').length !== 8) return;

    try {
      const addressData = await businessService.searchCep(cep.replace(/\D/g, ''));
      if (addressData && profile) {
        setProfile({
          ...profile,
          address: { ...profile.address, ...addressData, cep },
        });
        setHasChanges(true);
      }
    } catch (err) {
      console.error('Error searching CEP:', err);
    }
  };

  if (isLoading) {
    return (
      <SalonLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
        </div>
      </SalonLayout>
    );
  }

  if (!profile) {
    return (
      <SalonLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center text-gray-500">
          <AlertCircle className="h-12 w-12 text-gray-300" />
          <p className="mt-4">Erro ao carregar dados do negocio</p>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
              <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dados do Negocio
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Informacoes do seu estabelecimento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="text-sm">Salvo</span>
              </div>
            )}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Clientes</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalClients}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Calendar className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Agendamentos/Mes</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.monthlyAppointments}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Star className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Avaliacao</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {stats.averageRating.toFixed(1)} <span className="text-sm font-normal text-gray-500">({stats.totalReviews})</span>
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <Briefcase className="h-5 w-5" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Servicos</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalServices}</p>
            </div>
          </div>
        )}

        {/* Cover Image & Logo */}
        <div className="relative overflow-hidden rounded-lg">
          {/* Cover Image */}
          <div
            className="relative h-48 bg-gradient-to-br from-violet-500 to-purple-600"
            style={profile.coverImage ? { backgroundImage: `url(${profile.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 text-sm text-white hover:bg-black/70"
            >
              <Camera className="h-4 w-4" />
              Alterar capa
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>

          {/* Logo */}
          <div className="absolute -bottom-12 left-6">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-gray-100 shadow-lg dark:border-gray-800 dark:bg-gray-700">
                {profile.logo ? (
                  <img src={profile.logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <button
                onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full bg-violet-600 p-2 text-white shadow-lg hover:bg-violet-700"
              >
                <Upload className="h-4 w-4" />
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Spacer for logo overlap */}
        <div className="h-8" />

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {[
            { id: 'info', label: 'Informacoes' },
            { id: 'address', label: 'Endereco' },
            { id: 'schedule', label: 'Horarios' },
            { id: 'social', label: 'Redes Sociais' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-violet-600 shadow dark:bg-gray-700 dark:text-violet-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          {/* Informacoes */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nome do Estabelecimento"
                  value={profile.name}
                  onChange={(v) => handleChange('name', v)}
                  placeholder="Nome do seu salao"
                  icon={<Building2 className="h-5 w-5" />}
                />
                <Input
                  label="Nome Fantasia"
                  value={profile.tradeName || ''}
                  onChange={(v) => handleChange('tradeName', v)}
                  placeholder="Nome fantasia (opcional)"
                />
              </div>

              <Input
                label="CNPJ"
                value={profile.cnpj || ''}
                onChange={(v) => handleChange('cnpj', v)}
                placeholder="00.000.000/0000-00"
                mask="cnpj"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Telefone"
                  value={profile.phone}
                  onChange={(v) => handleChange('phone', v)}
                  placeholder="(00) 00000-0000"
                  icon={<Phone className="h-5 w-5" />}
                  mask="phone"
                />
                <Input
                  label="WhatsApp"
                  value={profile.whatsapp || ''}
                  onChange={(v) => handleChange('whatsapp', v)}
                  placeholder="(00) 00000-0000"
                  mask="phone"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="E-mail"
                  value={profile.email || ''}
                  onChange={(v) => handleChange('email', v)}
                  placeholder="contato@salao.com"
                  type="email"
                  icon={<Mail className="h-5 w-5" />}
                />
                <Input
                  label="Site"
                  value={profile.website || ''}
                  onChange={(v) => handleChange('website', v)}
                  placeholder="www.meusalao.com.br"
                  icon={<Globe className="h-5 w-5" />}
                />
              </div>

              <Textarea
                label="Descricao"
                value={profile.description || ''}
                onChange={(v) => handleChange('description', v)}
                placeholder="Descreva seu estabelecimento..."
                rows={4}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cor Principal
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={profile.primaryColor || '#7c3aed'}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {profile.primaryColor || '#7c3aed'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Endereco */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="CEP"
                  value={profile.address.cep}
                  onChange={(v) => {
                    handleAddressChange('cep', v);
                    if (v.replace(/\D/g, '').length === 8) {
                      searchCep(v);
                    }
                  }}
                  placeholder="00000-000"
                  mask="cep"
                  icon={<MapPin className="h-5 w-5" />}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Input
                    label="Rua"
                    value={profile.address.street}
                    onChange={(v) => handleAddressChange('street', v)}
                    placeholder="Nome da rua"
                  />
                </div>
                <Input
                  label="Numero"
                  value={profile.address.number}
                  onChange={(v) => handleAddressChange('number', v)}
                  placeholder="123"
                />
              </div>

              <Input
                label="Complemento"
                value={profile.address.complement || ''}
                onChange={(v) => handleAddressChange('complement', v)}
                placeholder="Sala, andar, etc. (opcional)"
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Bairro"
                  value={profile.address.neighborhood}
                  onChange={(v) => handleAddressChange('neighborhood', v)}
                  placeholder="Bairro"
                />
                <Input
                  label="Cidade"
                  value={profile.address.city}
                  onChange={(v) => handleAddressChange('city', v)}
                  placeholder="Cidade"
                />
                <Input
                  label="Estado"
                  value={profile.address.state}
                  onChange={(v) => handleAddressChange('state', v)}
                  placeholder="UF"
                />
              </div>
            </div>
          )}

          {/* Horarios */}
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure os dias e horarios de funcionamento do seu estabelecimento
              </p>

              {profile.schedule.days.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                    day.isOpen
                      ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  )}
                >
                  <div className="w-24">
                    <span className="font-medium text-gray-900 dark:text-white">{dayNames[index]}</span>
                  </div>

                  <ToggleSwitch
                    enabled={day.isOpen}
                    onChange={() => handleScheduleChange(index, 'isOpen', !day.isOpen)}
                  />

                  {day.isOpen ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.timeRanges[0]?.start || '09:00'}
                        onChange={(e) => handleScheduleChange(index, 'start', e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                      <span className="text-gray-500">ate</span>
                      <input
                        type="time"
                        value={day.timeRanges[0]?.end || '18:00'}
                        onChange={(e) => handleScheduleChange(index, 'end', e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">Fechado</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Redes Sociais */}
          {activeTab === 'social' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conecte suas redes sociais para aumentar sua visibilidade
              </p>

              <Input
                label="Instagram"
                value={profile.socialMedia?.instagram || ''}
                onChange={(v) => handleSocialChange('instagram', v)}
                placeholder="@meusalao"
                icon={<Instagram className="h-5 w-5" />}
              />

              <Input
                label="Facebook"
                value={profile.socialMedia?.facebook || ''}
                onChange={(v) => handleSocialChange('facebook', v)}
                placeholder="facebook.com/meusalao"
                icon={<Facebook className="h-5 w-5" />}
              />

              <Input
                label="TikTok"
                value={profile.socialMedia?.tiktok || ''}
                onChange={(v) => handleSocialChange('tiktok', v)}
                placeholder="@meusalao"
              />

              <Input
                label="YouTube"
                value={profile.socialMedia?.youtube || ''}
                onChange={(v) => handleSocialChange('youtube', v)}
                placeholder="youtube.com/@meusalao"
              />
            </div>
          )}
        </div>
      </div>
    </SalonLayout>
  );
}
