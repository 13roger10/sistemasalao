"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Calendar, LogOut, Users, CreditCard, CalendarCheck, UserCheck, MessageCircle, List, ScanLine, Timer } from "lucide-react";

function RecepcaoHub() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">Área da Recepcionista</h1>
            {user && <p className="text-xs text-gray-500">{user.name}</p>}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Modules */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="mb-6 text-sm text-gray-500">Selecione um módulo:</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Link
            href="/recepcao/agenda"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-violet-100 p-3">
              <Calendar className="h-6 w-6 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Agenda</span>
          </Link>
          <Link
            href="/recepcao/clientes"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Clientes</span>
          </Link>
          <Link
            href="/recepcao/pagamentos"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-green-100 p-3">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Pagamentos</span>
          </Link>
          <Link
            href="/recepcao/confirmacao-pagamento"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-emerald-100 p-3">
              <CalendarCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Confirmação</span>
          </Link>
          <Link
            href="/recepcao/atendimento"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-blue-100 p-3">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Atendimento</span>
          </Link>
          <Link
            href="/recepcao/comunicacao"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-violet-100 p-3">
              <MessageCircle className="h-6 w-6 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Comunicação</span>
          </Link>
          <Link
            href="/recepcao/lista-do-dia"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-orange-100 p-3">
              <List className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Lista do Dia</span>
          </Link>
          <Link
            href="/recepcao/checkin"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-teal-100 p-3">
              <ScanLine className="h-6 w-6 text-teal-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Check-in</span>
          </Link>
          <Link
            href="/recepcao/fila"
            className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="rounded-full bg-amber-100 p-3">
              <Timer className="h-6 w-6 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">Fila / Encaixe</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function RecepcaoPage() {
  return (
    <ProtectedRoute requiredRole="receptionist">
      <RecepcaoHub />
    </ProtectedRoute>
  );
}
