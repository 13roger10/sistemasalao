"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { ShieldCheck } from "lucide-react";

type LoginStep = "credentials" | "totp";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { error: showError } = useToast();

  const [step, setStep] = useState<LoginStep>("credentials");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [totpCode, setTotpCode] = useState("");

  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const requiresTwoFactor = await login(formData.email, formData.password);
      if (requiresTwoFactor) {
        setStep("totp");
      } else {
        window.location.href = "/admin/welcome";
      }
    } catch {
      showError("Falha no login", "Email ou senha inválidos");
    }
  };

  const handleSubmitTotp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totpCode.length < 6) {
      showError("Código inválido", "Digite o código de 6 dígitos do app autenticador.");
      return;
    }

    try {
      await login(formData.email, formData.password, totpCode);
      window.location.href = "/admin/welcome";
    } catch {
      showError("Código inválido", "Verifique o app autenticador e tente novamente.");
      setTotpCode("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 shadow-lg">
            {step === "totp" ? (
              <ShieldCheck className="h-8 w-8 text-white" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-white"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === "totp" ? "Verificação em 2 etapas" : "Social Studio IA"}
          </h1>
          <p className="mt-2 text-gray-600">
            {step === "totp"
              ? "Digite o código do Google Authenticator ou Authy"
              : "Acesse sua conta de administrador"}
          </p>
        </div>

        {/* Step 1: Email + Password */}
        {step === "credentials" && (
          <form
            onSubmit={handleSubmitCredentials}
            className="rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="admin@exemplo.com"
              />
              <Input
                label="Senha"
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                showPasswordToggle
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              fullWidth
              className="mt-6"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        )}

        {/* Step 2: TOTP Code */}
        {step === "totp" && (
          <form
            onSubmit={handleSubmitTotp}
            className="rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-violet-700">
                Abra o <strong>Google Authenticator</strong> ou <strong>Authy</strong> e
                digite o código de 6 dígitos da conta <strong>Belezza.ai</strong>.
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Código de verificação
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(
                      e.target.value.replace(/\D/g, "").substring(0, 6) ||
                        e.target.value.substring(0, 8).toUpperCase()
                    )
                  }
                  placeholder="000000"
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.75em] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Ou use um dos seus códigos de backup (8 caracteres)
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                type="submit"
                disabled={isLoading || totpCode.length < 6}
                isLoading={isLoading}
                fullWidth
              >
                {isLoading ? "Verificando..." : "Verificar código"}
              </Button>

              <button
                type="button"
                onClick={() => { setStep("credentials"); setTotpCode(""); }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Área restrita para administradores
        </p>
      </div>
    </div>
  );
}
