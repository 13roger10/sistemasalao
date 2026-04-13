"use client";

import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { apiClient } from "@/lib/api";

type Step = "idle" | "setup" | "confirm" | "backup-codes";

interface TwoFactorStatus {
  enabled: boolean;
  remainingBackupCodes: number;
}

export function TwoFactorSettings() {
  const { success, error: showError } = useToast();

  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [qrCodeUri, setQrCodeUri] = useState<string>("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesVisible, setCodesVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const fetchStatus = async () => {
    setInitialLoading(true);
    try {
      const data = await apiClient.get<TwoFactorStatus>("/2fa/status");
      setStatus(data);
    } catch {
      showError("Erro", "Não foi possível carregar o status do 2FA.");
    } finally {
      setInitialLoading(false);
    }
  };

  // Load status on first render
  useState(() => {
    fetchStatus();
  });

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post<{ qrCodeUri: string; message: string }>("/2fa/setup", {});
      setQrCodeUri(data.qrCodeUri);
      setStep("setup");
      setCode("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar configuração do 2FA.";
      showError("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (code.length < 6) {
      showError("Código inválido", "Digite o código de 6 dígitos do app autenticador.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.post<{ message: string; backupCodes: string[] }>("/2fa/enable", { code });
      setBackupCodes(data.backupCodes);
      setStep("backup-codes");
      setCode("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código inválido. Tente novamente.";
      showError("Código inválido", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!code) {
      showError("Código obrigatório", "Digite o código do app para desativar o 2FA.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/2fa/disable", { code });
      success("2FA Desativado", "Autenticação em dois fatores foi desativada.");
      setStep("idle");
      setCode("");
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código inválido.";
      showError("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!code) {
      showError("Código obrigatório", "Digite o código do app para regenerar os backup codes.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.post<{ backupCodes: string[] }>("/2fa/backup-codes/regenerate", { code });
      setBackupCodes(data.backupCodes);
      setCodesVisible(true);
      setCode("");
      success("Códigos Regenerados", "Novos backup codes foram gerados.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Código inválido.";
      showError("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSetup = async () => {
    setStep("idle");
    setBackupCodes([]);
    setQrCodeUri("");
    await fetchStatus();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success("Copiado!", "Código copiado para a área de transferência.");
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    success("Copiado!", "Todos os códigos foram copiados.");
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {status?.enabled ? (
          <ShieldCheck className="h-6 w-6 text-green-500" />
        ) : (
          <Shield className="h-6 w-6 text-gray-400" />
        )}
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Autenticação em Dois Fatores (2FA)
          </h3>
          <p className="text-sm text-gray-500">
            {status?.enabled
              ? `Ativado — ${status.remainingBackupCodes} códigos de backup restantes`
              : "Adicione uma camada extra de segurança à sua conta"}
          </p>
        </div>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${
            status?.enabled
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {status?.enabled ? "Ativo" : "Inativo"}
        </span>
      </div>

      {/* Step: idle — show enable / manage buttons */}
      {step === "idle" && (
        <div className="space-y-3">
          {!status?.enabled ? (
            <Button onClick={handleSetup} isLoading={loading} className="w-full sm:w-auto">
              <Shield className="mr-2 h-4 w-4" />
              Ativar 2FA
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Code input for disable / regenerate */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Código do app autenticador
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").substring(0, 6) || e.target.value.substring(0, 8).toUpperCase())}
                  placeholder="000000"
                  className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  isLoading={loading}
                  className="text-sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar backup codes
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDisable}
                  isLoading={loading}
                  className="text-sm"
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Desativar 2FA
                </Button>
              </div>
              {/* Show regenerated backup codes inline */}
              {backupCodes.length > 0 && (
                <BackupCodesList
                  codes={backupCodes}
                  visible={codesVisible}
                  onToggleVisibility={() => setCodesVisible((v) => !v)}
                  onCopyAll={copyAllCodes}
                  onCopyOne={copyToClipboard}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: setup — show QR code */}
      {step === "setup" && (
        <div className="space-y-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-sm text-gray-700">
            <strong>Passo 1:</strong> Escaneie o QR Code abaixo no{" "}
            <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
          </p>
          {qrCodeUri && (
            <div className="flex justify-center">
              <img
                src={qrCodeUri}
                alt="QR Code 2FA"
                className="h-48 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
              />
            </div>
          )}
          <p className="text-sm text-gray-700">
            <strong>Passo 2:</strong> Digite o código de 6 dígitos gerado pelo app para confirmar.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
              placeholder="000000"
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-center text-xl tracking-[0.5em] focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <div className="flex gap-2">
              <Button onClick={handleEnable} isLoading={loading} disabled={code.length !== 6}>
                Confirmar e Ativar
              </Button>
              <Button variant="outline" onClick={() => { setStep("idle"); setCode(""); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step: backup-codes — show 10 codes */}
      {step === "backup-codes" && (
        <div className="space-y-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800">2FA ativado com sucesso!</p>
              <p className="text-sm text-amber-700">
                Guarde estes códigos de backup em local seguro. Eles são mostrados{" "}
                <strong>apenas uma vez</strong> e servem para recuperar acesso caso perca o celular.
              </p>
            </div>
          </div>

          <BackupCodesList
            codes={backupCodes}
            visible={codesVisible}
            onToggleVisibility={() => setCodesVisible((v) => !v)}
            onCopyAll={copyAllCodes}
            onCopyOne={copyToClipboard}
          />

          <Button onClick={handleFinishSetup} className="w-full">
            Já guardei meus códigos — Concluir
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface BackupCodesListProps {
  codes: string[];
  visible: boolean;
  onToggleVisibility: () => void;
  onCopyAll: () => void;
  onCopyOne: (code: string) => void;
}

function BackupCodesList({
  codes,
  visible,
  onToggleVisibility,
  onCopyAll,
  onCopyOne,
}: BackupCodesListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Seus 10 códigos de backup:</span>
        <div className="flex gap-2">
          <button
            onClick={onToggleVisibility}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {visible ? "Ocultar" : "Mostrar"}
          </button>
          <button
            onClick={onCopyAll}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar todos
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {codes.map((code, idx) => (
          <button
            key={idx}
            onClick={() => onCopyOne(code)}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-1.5 font-mono text-sm hover:border-violet-300 hover:bg-violet-50"
            title="Clique para copiar"
          >
            <span className={visible ? "tracking-widest" : "tracking-widest text-gray-300"}>
              {visible ? code : "••••••••"}
            </span>
            <Copy className="h-3 w-3 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
