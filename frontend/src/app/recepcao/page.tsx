"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Calendar, LogOut, Users, CreditCard, CalendarCheck } from "lucide-react";

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
