"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, Clock, MapPin, Phone, Scissors, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Página pública de agendamento (BUG-014). Antes era toda simulada: serviços e profissionais
// fixos no código ("Corte Masculino R$ 50", "Carlos", "Ana") e um botão "Simular envio" que só
// esperava 2 segundos — o cliente via a confirmação e nenhum agendamento era criado.
// Agora mostra o salão e o cardápio reais e leva ao agendamento de verdade (/salon/book),
// que exige a conta de cliente do salão.

interface Vitrine {
  id: number;
  nome: string;
  descricao?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  logoUrl?: string;
}

interface Servico {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  duracaoMinutos: number;
  tipoDescricao?: string;
}

const moeda = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PublicBookingPage() {
  const params = useParams<{ salonId: string }>();
  const salonId = params?.salonId;

  const [salao, setSalao] = useState<Vitrine | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [estado, setEstado] = useState<"carregando" | "ok" | "nao-encontrado" | "erro">("carregando");

  useEffect(() => {
    if (!salonId || !/^\d+$/.test(salonId)) {
      setEstado("nao-encontrado");
      return;
    }
    let ativo = true;
    (async () => {
      try {
        const r = await fetch(`/api/public/salons/${salonId}`);
        if (r.status === 404) {
          if (ativo) setEstado("nao-encontrado");
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const dados: Vitrine = await r.json();
        const rs = await fetch(`/api/servicos/salon/${salonId}`);
        const lista: Servico[] = rs.ok ? await rs.json() : [];
        if (!ativo) return;
        setSalao(dados);
        setServicos(Array.isArray(lista) ? lista : []);
        setEstado("ok");
      } catch (e) {
        console.error("Erro ao carregar o salão:", e);
        if (ativo) setEstado("erro");
      }
    })();
    return () => {
      ativo = false;
    };
  }, [salonId]);

  const destino = `/salon/book?unit=${salonId}`;
  const linkAgendar = `/salon/login?redirect=${encodeURIComponent(destino)}`;

  if (estado === "carregando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (estado !== "ok" || !salao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {estado === "nao-encontrado" ? "Salão não encontrado" : "Não foi possível carregar o salão"}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {estado === "nao-encontrado"
              ? "Confira o link recebido do salão."
              : "Tente de novo em alguns instantes."}
          </p>
        </div>
      </div>
    );
  }

  const endereco = [salao.endereco, [salao.cidade, salao.estado].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center">
          {salao.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salao.logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              <Scissors className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{salao.nome}</h1>
            {endereco && (
              <p className="mt-1 flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {endereco}
              </p>
            )}
            {salao.telefone && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${salao.telefone.replace(/\D/g, "")}`} className="hover:underline">
                  {salao.telefone}
                </a>
              </p>
            )}
          </div>
          <Link href={linkAgendar} className="w-full sm:w-auto">
            <Button variant="primary" className="w-full" leftIcon={<Calendar className="h-4 w-4" />}>
              Agendar horário
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {salao.descricao && <p className="text-gray-600 dark:text-gray-300">{salao.descricao}</p>}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Serviços</h2>
          {servicos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              O salão ainda não publicou o cardápio de serviços.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {servicos.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{s.nome}</p>
                    {s.descricao && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{s.descricao}</p>}
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      {s.duracaoMinutos} min
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-violet-600 dark:text-violet-400">{moeda(s.preco)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-800 dark:bg-violet-900/20 dark:text-violet-300">
          Para escolher profissional, dia e horário, entre com a sua conta de cliente do salão. Ainda não tem
          conta? Fale com o salão{salao.telefone ? ` pelo ${salao.telefone}` : ""}.
        </div>
      </main>
    </div>
  );
}
