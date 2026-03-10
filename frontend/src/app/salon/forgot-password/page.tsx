"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Scissors, Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/salon/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao processar solicitação");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar email de recuperação");
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

          {/* Back to login */}
          <Link
            href="/salon/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Esqueceu sua senha?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Digite seu email e enviaremos instruções para redefinir sua senha.
            </p>
          </div>

          {/* Success message */}
          {success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Email enviado com sucesso!</p>
                  <p className="mt-1 text-green-600 dark:text-green-500">
                    Se o email <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Não recebeu o email? Verifique sua caixa de spam ou
                </p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
                >
                  tente novamente
                </button>
              </div>

              <Link
                href="/salon/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
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

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar instruções"
                  )}
                </button>
              </form>

              {/* Help text */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Lembrou da senha?{" "}
                  <Link
                    href="/salon/login"
                    className="font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
                  >
                    Faça login
                  </Link>
                </p>
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
              Recupere seu Acesso
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              Não se preocupe! Acontece com todos. Vamos ajudá-lo a recuperar o acesso à sua conta.
            </p>

            <div className="mt-12 max-w-md">
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm text-left">
                <h3 className="font-semibold mb-3">Como funciona:</h3>
                <ol className="space-y-2 text-sm text-white/80">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">1</span>
                    <span>Digite seu email cadastrado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">2</span>
                    <span>Verifique sua caixa de entrada</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">3</span>
                    <span>Clique no link e crie uma nova senha</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
