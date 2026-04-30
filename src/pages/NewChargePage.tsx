import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  UserGroupIcon,
  LightBulbIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const FIELD_CLASS =
  'w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#538f65]/40 transition-colors text-gray-800 placeholder-gray-400';
const LABEL_CLASS = 'block text-xs font-bold text-gray-600 mb-2 mt-4 first:mt-0';

export default function NewChargePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    concepto: '',
    monto: '',
    frecuencia: 'Un solo pago',
    alcance: 'General',
    grado: '',
    seccion: '',
    startDate: '',
  });

  const FRECUENCIAS = [
    { value: 'Un solo pago', label: t('payments.new.frequencies.oneTime') },
    { value: 'Diario', label: t('payments.new.frequencies.daily') },
    { value: 'Semanal', label: t('payments.new.frequencies.weekly') },
    { value: 'Mensual', label: t('payments.new.frequencies.monthly') },
  ];

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreate = () => {
    // API logic
    navigate('/payments');
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans text-gray-800">
      <div className="mb-8">
        <h1 className="text-[1.8rem] font-bold text-[#1a202c]">{t('payments.new.title')}</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">
          {t('payments.new.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Detalles del Pago */}
          <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <DocumentTextIcon className="w-6 h-6 text-[#538f65]" />
              <h2 className="text-lg font-bold text-[#538f65]">{t('payments.new.detailsTitle')}</h2>
            </div>

            <div>
              <label className={LABEL_CLASS}>{t('payments.new.conceptLabel')}</label>
              <input
                type="text"
                placeholder={t('payments.new.conceptPlaceholder')}
                value={form.concepto}
                onChange={set('concepto')}
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <div>
                <label className={LABEL_CLASS}>{t('payments.new.amountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">S/</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.monto}
                    onChange={set('monto')}
                    className={`${FIELD_CLASS} pl-10`}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>{t('payments.new.frequencyLabel')}</label>
                <div className="flex bg-[#EBE8DD] p-1 rounded-xl">
                  {FRECUENCIAS.map((freq) => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, frecuencia: freq.value }))}
                      className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-lg transition-colors ${
                        form.frecuencia === freq.value
                          ? 'bg-[#538f65] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 transition-all duration-300 ${form.frecuencia !== 'Un solo pago' ? 'opacity-100' : 'hidden opacity-0'}`}>
              <div className="sm:col-span-1">
                <label className={LABEL_CLASS}>{t('payments.new.startDateLabel')}</label>
                <div className="relative">
                  <input
                    type="date"
                    value={form.startDate || ''}
                    onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Card 2: Alcance del Cobro */}
          <div className="bg-[#FAF9F6] border border-[#EBE8DD] rounded-[2rem] p-8">
             <div className="flex items-center gap-3 mb-6">
              <UserGroupIcon className="w-6 h-6 text-[#538f65]" />
              <h2 className="text-lg font-bold text-[#538f65]">{t('payments.new.scopeTitle')}</h2>
            </div>
            
            <div className="flex flex-wrap gap-4 bg-[#F2F0E6] p-2 rounded-2xl mb-6">
              <label 
                className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl border cursor-pointer transition-colors ${
                  form.alcance === 'General' ? 'border-[#538f65] bg-white shadow-sm' : 'border-transparent text-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${form.alcance === 'General' ? 'border-[#538f65]' : 'border-gray-300'}`}>
                  {form.alcance === 'General' && <div className="w-2.5 h-2.5 bg-[#538f65] rounded-full" />}
                </div>
                <input
                  type="radio"
                  name="alcance"
                  className="hidden"
                  checked={form.alcance === 'General'}
                  onChange={() => setForm(p => ({ ...p, alcance: 'General' }))}
                />
                <span className="text-sm font-bold">{t('payments.new.scopeGeneral')}</span>
              </label>

              <label 
                className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl border cursor-pointer transition-colors ${
                  form.alcance === 'Especifico' ? 'border-[#538f65] bg-white shadow-sm' : 'border-transparent text-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${form.alcance === 'Especifico' ? 'border-[#538f65]' : 'border-gray-300'}`}>
                  {form.alcance === 'Especifico' && <div className="w-2.5 h-2.5 bg-[#538f65] rounded-full" />}
                </div>
                <input
                  type="radio"
                  name="alcance"
                  className="hidden"
                  checked={form.alcance === 'Especifico'}
                  onChange={() => setForm(p => ({ ...p, alcance: 'Especifico' }))}
                />
                <span className="text-sm font-bold">{t('payments.new.scopeSpecific')}</span>
              </label>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 transition-opacity ${form.alcance === 'General' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div>
                <label className={LABEL_CLASS}>{t('payments.new.gradeLabel')}</label>
                <select 
                  value={form.grado} 
                  onChange={set('grado')} 
                  className={FIELD_CLASS}
                >
                  <option value="">{t('payments.new.gradePlaceholder')}</option>
                  <option value="1">1er Grado</option>
                  <option value="2">2do Grado</option>
                  <option value="3">3er Grado</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>{t('payments.new.sectionLabel')}</label>
                <select 
                  value={form.seccion} 
                  onChange={set('seccion')} 
                  className={FIELD_CLASS}
                >
                  <option value="">{t('payments.new.sectionPlaceholder')}</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column Summaries & Tips */}
        <div className="space-y-6">
          
          {/* Black Résumé Box */}
          <div className="bg-[#1C1F1E] rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col justify-between h-auto shadow-lg">
             <h2 className="text-xl font-bold mb-8">{t('payments.new.resumeTitle')}</h2>
             
             <div className="space-y-6 mb-8">
               <div className="flex items-center justify-between border-b border-white/10 pb-4">
                 <span className="text-sm text-gray-400">{t('payments.new.affectedStudents')}</span>
                 <span className="text-lg font-bold">452</span>
               </div>
               <div className="flex items-center justify-between border-b border-white/10 pb-4">
                 <span className="text-sm text-gray-400">{t('payments.new.totalProjection')}</span>
                 <span className="text-lg font-bold text-[#6CA07C]">S/ {form.monto ? (parseInt(form.monto) * 452).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
               </div>
               <div className="flex items-center justify-between pb-4">
                 <span className="text-sm text-gray-400">{t('payments.new.issueDateLabel')}</span>
                 <span className="text-lg font-bold">{t('payments.new.today')}</span>
               </div>
             </div>

             <div className="mt-auto">
               <button 
                 onClick={handleCreate}
                 className="w-full flex items-center justify-center gap-2 py-4 bg-[#538f65] hover:bg-[#3f7350] rounded-xl text-sm font-bold transition-colors shadow-sm"
               >
                 <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
                 {t('payments.new.generateBtn')}
               </button>
               <p className="text-[10px] text-gray-500 text-center mt-4 leading-relaxed font-medium">
                 {t('payments.new.notice')}
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
