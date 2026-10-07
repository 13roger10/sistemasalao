"use client";

import { useEffect, useState } from "react";
import { Clock, KeyRound, Save, Scissors, User } from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { api } from "@/services/salon/api";
import { isStrongPassword } from "@/utils/validators";

/**
 * Meu Perfil da equipe (BUG-037): dados pessoais e, para o profissional, os horários de trabalho.
 * Antes o card "Meu Perfil" da área do profissional abria /salon/profile — o perfil do NEGÓCIO,
 * exclusivo do admin — e a tela mostrava "Erro ao carregar dados do negócio".
 */

interface UsuarioMe {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  role: string;
}

interface Horario {
  id: number;
  diaSemana: string;
  diaSemanaDescricao?: string;
  horaInicio: string;
  horaFim: string;
  intervaloInicio?: string;
  intervaloFim?: string;
  ativo: boolean;
}

const ORDEM_DIAS = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"];
const NOME_PAPEL: Record<string, string> = {
  ADMIN: "Administrador",
  RECEPCIONISTA: "Recepcionista",
  PROFISSIONAL: "Profissional",
};
const hhmm = (t?: string) => (t ? t.slice(0, 5) : "");
const semPrefixoHttp = (e: unknown) =>
  e instanceof Error ? e.message.replace(/^\[HTTP \d+\]\s*/, "") : "Tente novamente.";

export default function MeuPerfilPage() {
  const { user, logout } = useSalonAuth();
  const toast = useToast();
  const [me, setMe] = useState<UsuarioMe | null>(null);
  const [horarios, setHorarios] = useState<Horario[] | null>(null);
  // Especialidade e bio: o próprio profissional altera (BUG-041)
  const [especialidade, setEspecialidade] = useState("");
  const [bio, setBio] = useState("");
  const [salvandoProf, setSalvandoProf] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.get<UsuarioMe>("/auth/me")
      .then((dados) => {
        setMe(dados);
        setNome(dados.nome ?? "");
        setTelefone(dados.telefone ?? "");
      })
      .catch((e) => setErro(semPrefixoHttp(e)));
  }, []);

  useEffect(() => {
    if (!user?.professionalId) return;
    api.get<{ especialidade?: string; bio?: string }>(`/profissionais/${user.professionalId}`)
      .then((p) => { setEspecialidade(p.especialidade ?? ""); setBio(p.bio ?? ""); })
      .catch(() => {});
  }, [user?.professionalId]);

  const salvarProfissional = async () => {
    setSalvandoProf(true);
    try {
      const p = await api.put<{ especialidade?: string; bio?: string }>("/profissionais/me", { especialidade, bio });
      setEspecialidade(p.especialidade ?? "");
      setBio(p.bio ?? "");
      toast.success("Perfil profissional atualizado", "Especialidade e bio salvas.");
    } catch (e) {
      toast.error("Não foi possível salvar", semPrefixoHttp(e));
    } finally {
      setSalvandoProf(false);
    }
  };

  useEffect(() => {
    if (!user?.professionalId) return;
    api.get<Horario[]>(`/profissionais/${user.professionalId}/horarios`)
      .then((lista) => setHorarios(
        lista.filter((h) => h.ativo).sort((a, b) => ORDEM_DIAS.indexOf(a.diaSemana) - ORDEM_DIAS.indexOf(b.diaSemana))
      ))
      .catch(() => setHorarios([]));
  }, [user?.professionalId]);

  const salvar = async () => {
    if (nome.trim().length < 2) {
      toast.error("Nome inválido", "Informe o nome com pelo menos 2 caracteres.");
      return;
    }
    const body: Record<string, unknown> = { nome: nome.trim(), telefone: telefone.trim() };
    if (novaSenha) {
      if (!senhaAtual) {
        toast.error("Informe a senha atual", "Ela é necessária para trocar a senha.");
        return;
      }
      const politica = isStrongPassword(novaSenha);
      if (!politica.valid) {
        toast.error("Senha fraca", politica.errors[0]);
        return;
      }
      if (novaSenha !== confirmarSenha) {
        toast.error("As senhas não coincidem", "Digite a nova senha igual nos dois campos.");
        return;
      }
      body.password = novaSenha;
      body.senhaAtual = senhaAtual;
    }

    setSalvando(true);
    try {
      const atualizado = await api.put<UsuarioMe>("/usuarios/me", body);
      setMe(atualizado);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      // Mantém o nome/telefone do cabeçalho em dia sem precisar entrar de novo
      try {
        const chave = "salon_auth_user";
        const salvo = localStorage.getItem(chave);
        if (salvo) {
          localStorage.setItem(chave, JSON.stringify({ ...JSON.parse(salvo), name: atualizado.nome, phone: atualizado.telefone }));
        }
      } catch {
        // armazenamento indisponível: o nome novo aparece no próximo login
      }
      if (novaSenha) {
        // A troca de senha encerra todas as sessões, inclusive esta (BUG-016): entra de novo com a senha nova
        toast.success("Senha alterada", "Entre de novo com a nova senha.");
        setTimeout(logout, 1500);
        return;
      }
      toast.success("Perfil atualizado", "Seus dados foram salvos.");
    } catch (e) {
      toast.error("Não foi possível salvar", semPrefixoHttp(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SalonLayout pageTitle="Meu Perfil" requiredRole={["ADMIN", "RECEPCIONIST", "PROFESSIONAL"]}>
      <div className="mx-auto max-w-3xl space-y-6">
        {erro && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            Não foi possível carregar seu perfil: {erro}
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
              <User className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{me?.nome ?? user?.name ?? "—"}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {me ? `${NOME_PAPEL[me.role] ?? me.role} · ${me.email}` : user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={!me} />
            <Input label="Telefone" value={telefone} placeholder="(11) 99999-9999"
              onChange={(e) => setTelefone(e.target.value)} disabled={!me} />
          </div>

          <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <KeyRound className="h-4 w-4" /> Trocar senha (opcional)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Senha atual" type="password" value={senhaAtual} autoComplete="current-password"
              onChange={(e) => setSenhaAtual(e.target.value)} disabled={!me} />
            <Input label="Nova senha" type="password" value={novaSenha} autoComplete="new-password"
              onChange={(e) => setNovaSenha(e.target.value)} disabled={!me} />
            <Input label="Confirmar nova senha" type="password" value={confirmarSenha} autoComplete="new-password"
              onChange={(e) => setConfirmarSenha(e.target.value)} disabled={!me} />
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={salvar} isLoading={salvando} disabled={!me} leftIcon={<Save className="h-4 w-4" />}>
              Salvar
            </Button>
          </div>
        </section>

        {user?.professionalId && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Scissors className="h-5 w-5 text-violet-500" /> Perfil profissional
            </h3>
            <div className="space-y-4">
              <Input label="Especialidade" value={especialidade} maxLength={300}
                placeholder="Ex.: Cortes, Coloração, Barba" onChange={(e) => setEspecialidade(e.target.value)} />
              <div>
                <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <textarea id="bio" value={bio} maxLength={500} rows={3} onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte sua experiência para os clientes"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={salvarProfissional} isLoading={salvandoProf} leftIcon={<Save className="h-4 w-4" />}>
                Salvar perfil profissional
              </Button>
            </div>
          </section>
        )}

        {user?.professionalId && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Clock className="h-5 w-5 text-violet-500" /> Meus horários de trabalho
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Para mudar seus horários, fale com o administrador do salão.
            </p>
            {horarios === null ? (
              <p className="text-sm text-gray-500">Carregando…</p>
            ) : horarios.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum horário cadastrado.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {horarios.map((h) => (
                  <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{h.diaSemanaDescricao ?? h.diaSemana}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {hhmm(h.horaInicio)}–{hhmm(h.horaFim)}
                      {h.intervaloInicio && h.intervaloFim ? ` · intervalo ${hhmm(h.intervaloInicio)}–${hhmm(h.intervaloFim)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </SalonLayout>
  );
}
