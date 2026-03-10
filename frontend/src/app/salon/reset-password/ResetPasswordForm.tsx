"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Scissors, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Valida se tem token
  useEffect(() => {
    if (!token) {
      setError("Token de recuperação não encontrado. Solicite um novo link.");
    }
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "A senha deve ter no mínimo 8 caracteres";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "A senha deve conter pelo menos uma letra maiúscula";
    }
    if (!/[a-z]/.test(pwd)) {
      return "A senha deve conter pelo menos uma letra minúscula";
    }
    if (!/[0-9]/.test(pwd)) {
      return "A senha deve conter pelo menos um número";
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validações
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/salon/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao redefinir senha");
      }

      setSuccess(true);

      // Redireciona para login após 3 segundos
      setTimeout(() => {
        router.push("/salon/login");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setIsLoading(false);
    }
  };

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
              Redefinir Senha
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Digite sua nova senha abaixo.
            </p>
          </div>

          {/* Success message */}
          {success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Senha alterada com sucesso!</p>
                  <p className="mt-1 text-green-600 dark:text-green-500">
                    Você será redirecionado para a página de login...
                  </p>
                </div>
              </div>

              <Link
                href="/salon/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                Ir para o login
              </Link>
            </div>
          ) : !token ? (
            // No token error
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Link inválido</p>
                  <p className="mt-1">
                    O link de recuperação de senha é inválido ou expirou. Por favor, solicite um novo link.
                  </p>
                </div>
              </div>

              <Link
                href="/salon/forgot-password"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                Solicitar novo link
              </Link>
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nova Senha
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
                      minLength={8}
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

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={8}
                      className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-12 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password requirements */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    A senha deve conter:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li className={`flex items-center gap-2 ${password.length >= 8 ? "text-green-600 dark:text-green-400" : ""}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? "bg-green-500" : "bg-gray-400"}`} />
                      Mínimo 8 caracteres
                    </li>
                    <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? "text-green-600 dark:text-green-400" : ""}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(password) ? "bg-green-500" : "bg-gray-400"}`} />
                      Uma letra maiúscula
                    </li>
                    <li className={`flex items-center gap-2 ${/[a-z]/.test(password) ? "text-green-600 dark:text-green-400" : ""}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${/[a-z]/.test(password) ? "bg-green-500" : "bg-gray-400"}`} />
                      Uma letra minúscula
                    </li>
                    <li className={`flex items-center gap-2 ${/[0-9]/.test(password) ? "text-green-600 dark:text-green-400" : ""}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(password) ? "bg-green-500" : "bg-gray-400"}`} />
                      Um número
                    </li>
                  </ul>
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
                      Redefinindo...
                    </>
                  ) : (
                    "Redefinir Senha"
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-8 text-center">
                <Link
                  href="/salon/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side - Image/Branding */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-purple-700">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 text-center text-white">
            <Scissors className="h-20 w-20 mb-8 opacity-90" />
            <h2 className="text-4xl font-bold mb-4">
              Nova Senha
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              Crie uma senha forte e segura para proteger sua conta.
            </p>

            <div className="mt-12 max-w-md">
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm text-left">
                <h3 className="font-semibold mb-3">Dicas de segurança:</h3>
                <ul className="space-y-2 text-sm text-white/80">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Não use senhas óbvias como datas de nascimento</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Evite usar a mesma senha em outros sites</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Considere usar um gerenciador de senhas</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
