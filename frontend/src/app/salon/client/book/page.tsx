import { redirect } from 'next/navigation';

/**
 * O agendamento do cliente é /salon/book (é para lá que apontam o menu, o login e "Minha Agenda").
 * Esta rota antiga, sem link no sistema, montava um segundo fluxo com dois cabeçalhos "Novo
 * Agendamento" empilhados no celular e criava o agendamento pela rota da equipe (BUG-038).
 */
export default function ClientBookPage() {
  redirect('/salon/book');
}
