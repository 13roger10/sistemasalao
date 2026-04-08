'use client';

import { ReactNode } from 'react';

interface ClientLayoutProps {
  children: ReactNode;
}

// Layout simplificado - a autenticação é feita pelo SalonLayout das páginas
export default function ClientLayout({ children }: ClientLayoutProps) {
  return <>{children}</>;
}
