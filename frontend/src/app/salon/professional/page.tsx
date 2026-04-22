"use client";

import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { SalonLayout } from "@/components/layout/SalonLayout";
import {
  Calendar,
  DollarSign,
  Star,
  Clock,
  ArrowRight,
  Scissors,
  User,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
}

function QuickActionCard({ title, description, href, icon, iconBg }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-800 dark:hover:border-violet-700"
    >
      <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl", iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-violet-500 dark:text-gray-600 dark:group-hover:text-violet-400" />
    </Link>
  );
}

export default function ProfessionalHomePage() {
  const { user } = useSalonAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Profissional";

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <SalonLayout pageTitle="Minha Área" requiredRole="PROFESSIONAL">
      <div className="space-y-6">
        {/* Boas-vindas */}
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Olá, {firstName}!</h2>
              <p className="mt-1 capitalize text-violet-100">{today}</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Scissors className="h-4 w-4 text-violet-200" />
              <span className="text-sm font-medium text-violet-100">Área do Profissional</span>
            </div>
          </div>
        </div>

        {/* Acesso rápido */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Acesso Rápido
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
            <QuickActionCard
              title="Minha Agenda"
              description="Visualize e gerencie seus agendamentos"
              href="/salon/appointments"
              icon={<Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />}
              iconBg="bg-violet-100 dark:bg-violet-900/40"
            />
            <QuickActionCard
              title="Comissões"
              description="Acompanhe seus ganhos e comissões"
              href="/salon/commission"
              icon={<DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />}
              iconBg="bg-green-100 dark:bg-green-900/40"
            />
            <QuickActionCard
              title="Avaliações"
              description="Veja as avaliações dos seus clientes"
              href="/salon/reviews"
              icon={<Star className="h-6 w-6 text-yellow-500" />}
              iconBg="bg-yellow-100 dark:bg-yellow-900/40"
            />
            <QuickActionCard
              title="Meu Perfil"
              description="Gerencie seus dados e horários de trabalho"
              href="/salon/profile"
              icon={<User className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
              iconBg="bg-blue-100 dark:bg-blue-900/40"
            />
          </div>
        </div>

        {/* Aviso agenda do dia */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-900/20">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-600 dark:text-violet-400" />
            <div>
              <p className="font-semibold text-violet-900 dark:text-violet-200">
                Agenda de hoje
              </p>
              <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
                Acesse <Link href="/salon/appointments" className="font-medium underline underline-offset-2 hover:no-underline">Minha Agenda</Link> para ver seus atendimentos do dia, confirmar horários e atualizar status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SalonLayout>
  );
}
