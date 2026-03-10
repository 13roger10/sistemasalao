"use client";

import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";
import { Scissors, Loader2 } from "lucide-react";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
      <div className="text-center text-white">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Carregando...</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
