'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSalonAuth } from '@/contexts/SalonAuthContext';
import {
  ArrowLeft,
  User,
  Camera,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormData {
  nome: string;
  telefone: string;
  avatarUrl: string;
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

interface FormErrors {
  nome?: string;
  telefone?: string;
  senhaAtual?: string;
  novaSenha?: string;
  confirmarSenha?: string;
}

export default function EditProfilePage() {
  const { user, token } = useSalonAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormData>({
    nome: user?.name || '',
    telefone: user?.phone || '',
    avatarUrl: user?.avatar || '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (form.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (form.telefone && form.telefone.replace(/\D/g, '').length < 10) {
      newErrors.telefone = 'Telefone inválido';
    }

    if (showPasswordSection) {
      if (!form.senhaAtual) {
        newErrors.senhaAtual = 'Informe a senha atual';
      }
      if (!form.novaSenha) {
        newErrors.novaSenha = 'Informe a nova senha';
      } else if (form.novaSenha.length < 6) {
        newErrors.novaSenha = 'Senha deve ter pelo menos 6 caracteres';
      }
      if (form.novaSenha !== form.confirmarSenha) {
        newErrors.confirmarSenha = 'As senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setForm(prev => ({ ...prev, telefone: formatted }));
    if (errors.telefone) setErrors(prev => ({ ...prev, telefone: undefined }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simula preview local com FileReader
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setForm(prev => ({ ...prev, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!user?.id) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const body: Record<string, unknown> = {
        nome: form.nome.trim(),
        telefone: form.telefone.replace(/\D/g, '') || null,
      };

      if (form.avatarUrl && form.avatarUrl !== user.avatar) {
        body.avatarUrl = form.avatarUrl;
      }

      if (showPasswordSection && form.novaSenha) {
        body.password = form.novaSenha;
      }

      const response = await fetch(`/api/usuarios/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao atualizar perfil');
      }

      // Atualiza dados locais no localStorage
      const USER_KEY = 'salon_auth_user';
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const updatedUser = {
          ...parsedUser,
          name: form.nome.trim(),
          phone: form.telefone || parsedUser.phone,
          avatar: body.avatarUrl || parsedUser.avatar,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }

      setFeedback({ type: 'success', message: 'Perfil atualizado com sucesso!' });

      // Limpa campos de senha
      setForm(prev => ({ ...prev, senhaAtual: '', novaSenha: '', confirmarSenha: '' }));
      setShowPasswordSection(false);

      setTimeout(() => {
        router.push('/salon/client/profile');
      }, 1500);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao atualizar perfil',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 px-4 pb-20 pt-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/salon/client/profile')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Editar Perfil</h1>
        </div>
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* Card principal */}
      <div className="relative -mt-16 px-4 pb-24">
        <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">

          {/* Avatar */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-violet-600 ring-4 ring-white dark:bg-violet-900/30 dark:text-violet-400 dark:ring-gray-800">
                {form.avatarUrl ? (
                  <Image
                    src={form.avatarUrl}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12" />
                )}
              </div>
              <button
                onClick={handleAvatarClick}
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-violet-500 text-white shadow-md hover:bg-violet-600 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Toque no ícone para trocar a foto
            </p>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={cn(
                'mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium',
                feedback.type === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              )}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {feedback.message}
            </div>
          )}

          {/* Campos */}
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome completo
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, nome: e.target.value }));
                  if (errors.nome) setErrors(prev => ({ ...prev, nome: undefined }));
                }}
                placeholder="Seu nome"
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors dark:bg-gray-700 dark:text-white',
                  'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
                  errors.nome
                    ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/10'
                    : 'border-gray-200 bg-white dark:border-gray-600'
                )}
              />
              {errors.nome && (
                <p className="mt-1 text-xs text-red-500">{errors.nome}</p>
              )}
            </div>

            {/* Email (somente leitura) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail
              </label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                O e-mail não pode ser alterado
              </p>
            </div>

            {/* Telefone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefone
              </label>
              <input
                type="tel"
                value={form.telefone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition-colors dark:bg-gray-700 dark:text-white',
                  'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
                  errors.telefone
                    ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/10'
                    : 'border-gray-200 bg-white dark:border-gray-600'
                )}
              />
              {errors.telefone && (
                <p className="mt-1 text-xs text-red-500">{errors.telefone}</p>
              )}
            </div>
          </div>

          {/* Seção de senha */}
          <div className="mt-6">
            <button
              onClick={() => {
                setShowPasswordSection(prev => !prev);
                setErrors({});
              }}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
            >
              <span>Alterar senha</span>
              <span className="text-xs text-violet-500">
                {showPasswordSection ? 'Cancelar' : 'Alterar'}
              </span>
            </button>

            {showPasswordSection && (
              <div className="mt-4 space-y-4 rounded-xl border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/30 dark:bg-violet-900/10">
                {/* Senha atual */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha atual
                  </label>
                  <div className="relative">
                    <input
                      type={showSenhaAtual ? 'text' : 'password'}
                      value={form.senhaAtual}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, senhaAtual: e.target.value }));
                        if (errors.senhaAtual) setErrors(prev => ({ ...prev, senhaAtual: undefined }));
                      }}
                      placeholder="••••••••"
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 pr-11 text-sm text-gray-900 outline-none transition-colors dark:bg-gray-700 dark:text-white',
                        'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
                        errors.senhaAtual
                          ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/10'
                          : 'border-gray-200 bg-white dark:border-gray-600'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenhaAtual(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.senhaAtual && (
                    <p className="mt-1 text-xs text-red-500">{errors.senhaAtual}</p>
                  )}
                </div>

                {/* Nova senha */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showNovaSenha ? 'text' : 'password'}
                      value={form.novaSenha}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, novaSenha: e.target.value }));
                        if (errors.novaSenha) setErrors(prev => ({ ...prev, novaSenha: undefined }));
                      }}
                      placeholder="Mínimo 6 caracteres"
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 pr-11 text-sm text-gray-900 outline-none transition-colors dark:bg-gray-700 dark:text-white',
                        'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
                        errors.novaSenha
                          ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/10'
                          : 'border-gray-200 bg-white dark:border-gray-600'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNovaSenha(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.novaSenha && (
                    <p className="mt-1 text-xs text-red-500">{errors.novaSenha}</p>
                  )}
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmarSenha ? 'text' : 'password'}
                      value={form.confirmarSenha}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, confirmarSenha: e.target.value }));
                        if (errors.confirmarSenha) setErrors(prev => ({ ...prev, confirmarSenha: undefined }));
                      }}
                      placeholder="Repita a nova senha"
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 pr-11 text-sm text-gray-900 outline-none transition-colors dark:bg-gray-700 dark:text-white',
                        'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
                        errors.confirmarSenha
                          ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/10'
                          : 'border-gray-200 bg-white dark:border-gray-600'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmarSenha(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmarSenha && (
                    <p className="mt-1 text-xs text-red-500">{errors.confirmarSenha}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botão salvar */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-4 font-semibold text-white transition-colors',
              'hover:bg-violet-700 active:bg-violet-800',
              isSaving && 'cursor-not-allowed opacity-70'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
