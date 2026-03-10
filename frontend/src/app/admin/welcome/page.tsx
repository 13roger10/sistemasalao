"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, CheckCircle2, Wand2, ImagePlus, Calendar } from "lucide-react";

const features = [
  { icon: Wand2, text: "Geração de texto com IA", delay: 0 },
  { icon: ImagePlus, text: "Edição profissional de imagens", delay: 200 },
  { icon: Calendar, text: "Agendamento automático", delay: 400 },
];

export default function WelcomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    // Animation sequence
    const timer1 = setTimeout(() => setCurrentStep(1), 500);
    const timer2 = setTimeout(() => setShowFeatures(true), 1000);
    const timer3 = setTimeout(() => setCurrentStep(2), 2500);
    const timer4 = setTimeout(() => setRedirect(true), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (redirect) {
      router.replace("/admin/dashboard");
    }
  }, [redirect, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-600 to-purple-700">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-purple-700 px-6 text-white">
      {/* Logo Animation */}
      <div
        className={`
          mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm shadow-2xl
          transition-all duration-700 ease-out
          ${currentStep >= 1 ? "scale-100 opacity-100" : "scale-50 opacity-0"}
        `}
      >
        <Sparkles className="h-12 w-12 text-white" />
      </div>

      {/* Welcome Text */}
      <div
        className={`
          mb-4 text-center transition-all duration-500
          ${currentStep >= 1 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
        `}
      >
        <h1 className="text-3xl font-bold">
          Olá, {user?.name?.split(" ")[0] || "Usuário"}!
        </h1>
        <p className="mt-2 text-lg text-white/80">
          Bem-vindo ao Social Studio IA
        </p>
      </div>

      {/* Features */}
      <div className="mb-12 flex flex-col gap-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-6 py-3
                transition-all duration-500
                ${showFeatures ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"}
              `}
              style={{ transitionDelay: `${feature.delay}ms` }}
            >
              <Icon className="h-5 w-5 text-violet-200" />
              <span className="text-white/90">{feature.text}</span>
            </div>
          );
        })}
      </div>

      {/* Loading Indicator */}
      <div
        className={`
          flex flex-col items-center gap-3 transition-all duration-500
          ${currentStep >= 2 ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-300" />
          <span className="text-white/80">Preparando seu ambiente...</span>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/20">
          <div
            className={`
              h-full bg-white rounded-full transition-all duration-1000
              ${currentStep >= 2 ? "w-full" : "w-0"}
            `}
          />
        </div>
      </div>
    </div>
  );
}
