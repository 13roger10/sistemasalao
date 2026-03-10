"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scissors, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { AUTH_ROLE_LABELS, AuthUserRole } from "@/types/salon/auth";

export default function SalonLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading, user } = useSalonAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Redireciona se já autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      const roleRedirects: Record<AuthUserRole, string> = {
        ADMIN: "/salon/dashboard",
        RECEPCIONIST: "/salon/dashboard",
        PROFESSIONAL: "/salon/appointments",
        CLIENT: "/salon/client/appointments",
      };
      router.push(roleRedirects[user.role]);
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirecionamento é feito pelo useEffect acima
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  // Usuários de demonstração
  const demoUsers = [
    { email: "admin@belezza.com", password: "admin123", role: "ADMIN" as AuthUserRole },
    { email: "recepcionista@belezza.com", password: "recep123", role: "RECEPCIONIST" as AuthUserRole },
    { email: "profissional@belezza.com", password: "prof123", role: "PROFESSIONAL" as AuthUserRole },
    { email: "cliente@belezza.com", password: "cliente123", role: "CLIENT" as AuthUserRole },
  ];

  const fillDemoUser = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 bg-white dark:bg-gray-900">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Belezza</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Salão & Barbearia</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-12 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Lembrar de mim
                </span>
              </label>
              <Link
                href="/salon/forgot-password"
                className="text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
              >
                Esqueceu a senha?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Demo users */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  Usuários de demonstração
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {demoUsers.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => fillDemoUser(demo.email, demo.password)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {AUTH_ROLE_LABELS[demo.role]}
                </button>
              ))}
            </div>
          </div>

          {/* Link para agendamento público */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Quer agendar um horário?{" "}
              <Link
                href="/salon/book"
                className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
              >
                Agende aqui
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image/Branding */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-purple-700">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 text-center text-white">
            <Scissors className="h-20 w-20 mb-8 opacity-90" />
            <h2 className="text-4xl font-bold mb-4">
              Sistema Completo para seu Salão
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              Gerencie agendamentos, clientes, financeiro, comissões e muito mais em uma única plataforma.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-6 text-left">
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold mb-1">Agendamento Online</h3>
                <p className="text-sm text-white/70">Seus clientes agendam 24/7</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold mb-1">Controle Financeiro</h3>
                <p className="text-sm text-white/70">Caixa e comissões em dia</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold mb-1">Programa de Fidelidade</h3>
                <p className="text-sm text-white/70">Fidelize seus clientes</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold mb-1">Multi-unidade</h3>
                <p className="text-sm text-white/70">Gerencie várias unidades</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
