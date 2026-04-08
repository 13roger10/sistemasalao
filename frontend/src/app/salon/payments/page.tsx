'use client';

import { useState } from 'react';
import {
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  Check,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Percent,
  DollarSign,
  Settings,
  Link2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'credit' | 'debit' | 'pix' | 'transfer' | 'other';
  enabled: boolean;
  fee: number; // taxa em percentual
  installments?: number; // parcelas permitidas
}

interface PaymentSettings {
  methods: PaymentMethod[];
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  requirePaymentOnBooking: boolean;
  allowPartialPayment: boolean;
  defaultInstallments: number;
  minimumInstallmentValue: number;
}

const defaultMethods: PaymentMethod[] = [
  { id: '1', name: 'Dinheiro', type: 'cash', enabled: true, fee: 0 },
  { id: '2', name: 'PIX', type: 'pix', enabled: true, fee: 0 },
  { id: '3', name: 'Cartao de Credito', type: 'credit', enabled: true, fee: 2.5, installments: 12 },
  { id: '4', name: 'Cartao de Debito', type: 'debit', enabled: true, fee: 1.5 },
  { id: '5', name: 'Transferencia', type: 'transfer', enabled: false, fee: 0 },
];

const defaultSettings: PaymentSettings = {
  methods: defaultMethods,
  pixKey: '',
  pixKeyType: 'cpf',
  requirePaymentOnBooking: false,
  allowPartialPayment: true,
  defaultInstallments: 3,
  minimumInstallmentValue: 50,
};

const methodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-5 w-5" />,
  credit: <CreditCard className="h-5 w-5" />,
  debit: <CreditCard className="h-5 w-5" />,
  pix: <QrCode className="h-5 w-5" />,
  transfer: <Smartphone className="h-5 w-5" />,
  other: <DollarSign className="h-5 w-5" />,
};

const methodColors: Record<string, string> = {
  cash: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  credit: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  debit: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  pix: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  transfer: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const pixKeyTypes = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave Aleatoria' },
];

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
}

function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative flex-shrink-0 rounded-full transition-colors',
        enabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
      )}
      style={{ width: '44px', height: '24px' }}
    >
      <span
        className="absolute rounded-full bg-white shadow-md transition-transform duration-200"
        style={{
          width: '18px',
          height: '18px',
          top: '3px',
          left: '3px',
          transform: enabled ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

export default function PaymentsPage() {
  const [settings, setSettings] = useState<PaymentSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('payment_settings');
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethod, setNewMethod] = useState<Partial<PaymentMethod>>({
    name: '',
    type: 'other',
    fee: 0,
    enabled: true,
  });

  const handleChange = (updates: Partial<PaymentSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleMethodToggle = (methodId: string) => {
    const updatedMethods = settings.methods.map(m =>
      m.id === methodId ? { ...m, enabled: !m.enabled } : m
    );
    handleChange({ methods: updatedMethods });
  };

  const handleMethodUpdate = (methodId: string, updates: Partial<PaymentMethod>) => {
    const updatedMethods = settings.methods.map(m =>
      m.id === methodId ? { ...m, ...updates } : m
    );
    handleChange({ methods: updatedMethods });
  };

  const handleAddMethod = () => {
    if (!newMethod.name) return;

    const method: PaymentMethod = {
      id: Date.now().toString(),
      name: newMethod.name,
      type: newMethod.type || 'other',
      enabled: true,
      fee: newMethod.fee || 0,
      installments: newMethod.type === 'credit' ? 12 : undefined,
    };

    handleChange({ methods: [...settings.methods, method] });
    setNewMethod({ name: '', type: 'other', fee: 0, enabled: true });
    setShowAddMethod(false);
  };

  const handleDeleteMethod = (methodId: string) => {
    const updatedMethods = settings.methods.filter(m => m.id !== methodId);
    handleChange({ methods: updatedMethods });
  };

  const handleSave = () => {
    localStorage.setItem('payment_settings', JSON.stringify(settings));
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('payment_settings');
    setHasChanges(false);
  };

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Pagamentos
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure formas de pagamento e taxas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="text-sm">Salvo</span>
              </div>
            )}
            {hasChanges && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
              >
                <Save className="h-4 w-4" />
                Salvar
              </button>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Formas de Pagamento</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ative ou desative metodos de pagamento aceitos
              </p>
            </div>
            <button
              onClick={() => setShowAddMethod(true)}
              className="flex items-center gap-2 rounded-lg bg-violet-100 px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>

          {/* Add Method Form */}
          {showAddMethod && (
            <div className="border-b border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/50">
              <h4 className="mb-4 font-medium text-gray-900 dark:text-white">Nova Forma de Pagamento</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Nome</label>
                  <input
                    type="text"
                    value={newMethod.name || ''}
                    onChange={e => setNewMethod({ ...newMethod, name: e.target.value })}
                    placeholder="Ex: Vale Refeicao"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Tipo</label>
                  <select
                    value={newMethod.type || 'other'}
                    onChange={e => setNewMethod({ ...newMethod, type: e.target.value as PaymentMethod['type'] })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="credit">Credito</option>
                    <option value="debit">Debito</option>
                    <option value="pix">PIX</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Taxa (%)</label>
                  <input
                    type="number"
                    value={newMethod.fee || 0}
                    onChange={e => setNewMethod({ ...newMethod, fee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddMethod(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMethod}
                  disabled={!newMethod.name}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* Methods List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {settings.methods.map(method => (
              <div key={method.id} className="p-5">
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', methodColors[method.type])}>
                    {methodIcons[method.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{method.name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      {method.fee > 0 && (
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {method.fee}% taxa
                        </span>
                      )}
                      {method.installments && (
                        <span>ate {method.installments}x</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingMethod(editingMethod === method.id ? null : method.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <ToggleSwitch
                      enabled={method.enabled}
                      onChange={() => handleMethodToggle(method.id)}
                    />
                  </div>
                </div>

                {/* Edit Method */}
                {editingMethod === method.id && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Nome</label>
                        <input
                          type="text"
                          value={method.name}
                          onChange={e => handleMethodUpdate(method.id, { name: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Taxa (%)</label>
                        <input
                          type="number"
                          value={method.fee}
                          onChange={e => handleMethodUpdate(method.id, { fee: parseFloat(e.target.value) || 0 })}
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      {method.type === 'credit' && (
                        <div>
                          <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Max. Parcelas</label>
                          <select
                            value={method.installments || 1}
                            onChange={e => handleMethodUpdate(method.id, { installments: parseInt(e.target.value) })}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                              <option key={n} value={n}>{n}x</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleDeleteMethod(method.id)}
                        className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PIX Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-cyan-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">Configuracoes do PIX</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Tipo de Chave</label>
              <select
                value={settings.pixKeyType}
                onChange={e => handleChange({ pixKeyType: e.target.value as PaymentSettings['pixKeyType'] })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {pixKeyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Chave PIX</label>
              <input
                type="text"
                value={settings.pixKey}
                onChange={e => handleChange({ pixKey: e.target.value })}
                placeholder={
                  settings.pixKeyType === 'cpf' ? '000.000.000-00' :
                  settings.pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                  settings.pixKeyType === 'email' ? 'email@exemplo.com' :
                  settings.pixKeyType === 'phone' ? '+55 11 99999-9999' :
                  'Chave aleatoria'
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {settings.pixKey && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-cyan-50 p-3 dark:bg-cyan-900/20">
              <Link2 className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-cyan-700 dark:text-cyan-300">
                Chave configurada: {settings.pixKey}
              </span>
            </div>
          )}
        </div>

        {/* Installments Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">Parcelamento</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Parcelas Padrao</label>
              <select
                value={settings.defaultInstallments}
                onChange={e => handleChange({ defaultInstallments: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                  <option key={n} value={n}>{n}x sem juros</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Valor Minimo por Parcela</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                <input
                  type="number"
                  value={settings.minimumInstallmentValue}
                  onChange={e => handleChange({ minimumInstallmentValue: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="10"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {/* Require Payment on Booking */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Exigir Pagamento no Agendamento</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cliente deve pagar antecipadamente para confirmar o agendamento
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.requirePaymentOnBooking}
              onChange={() => handleChange({ requirePaymentOnBooking: !settings.requirePaymentOnBooking })}
            />
          </div>

          {/* Allow Partial Payment */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-start gap-3">
              <Percent className="mt-0.5 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Permitir Pagamento Parcial</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permite que o cliente pague parte do valor como sinal
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.allowPartialPayment}
              onChange={() => handleChange({ allowPartialPayment: !settings.allowPartialPayment })}
            />
          </div>
        </div>

        {/* Integration Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Link2 className="mt-0.5 h-5 w-5 text-blue-500" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Integracoes de Pagamento</h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Para aceitar pagamentos online automaticamente, integre com uma plataforma de pagamentos.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:bg-transparent dark:text-blue-400">
                  Configurar Stripe
                </button>
                <button className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:bg-transparent dark:text-blue-400">
                  Configurar PagSeguro
                </button>
                <button className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:bg-transparent dark:text-blue-400">
                  Configurar Mercado Pago
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center pb-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrao
          </button>
        </div>
      </div>
    </SalonLayout>
  );
}
