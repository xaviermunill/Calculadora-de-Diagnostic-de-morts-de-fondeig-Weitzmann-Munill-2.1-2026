import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Calculator } from './components/Calculator';
import { InventoryManager } from './components/InventoryManager';
import { InventoryMap } from './components/InventoryMap';
import { HydrodynamicsPanel } from './components/HydrodynamicsPanel';
import { ProtocolDocs } from './components/ProtocolDocs';
import { InspectionReportModal } from './components/InspectionReportModal';
import { BatchInspectionDossierModal } from './components/BatchInspectionDossierModal';
import { MortEvaluationRecord } from './types';
import { INITIAL_SAMPLE_EVALUATIONS } from './data/sampleEvaluations';
import { sendPointEmailNotification, generateMailtoUrl, TARGET_NOTIFICATION_EMAIL } from './utils/emailNotifier';
import { Mail, CheckCircle, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'morts_fondeig_evaluations_v1';

interface EmailToastState {
  id: string;
  code: string;
  recipient: string;
  status: 'sending' | 'sent' | 'error';
  message: string;
  mailtoUrl?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'calculator' | 'inventory' | 'map' | 'hydrodynamics' | 'protocol'
  >('calculator');

  // Inventory records initialized from local storage or initial sample data
  const [records, setRecords] = useState<MortEvaluationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading from localStorage', e);
    }
    return INITIAL_SAMPLE_EVALUATIONS;
  });

  // Current record in calculator
  const [currentEditingRecord, setCurrentEditingRecord] =
    useState<MortEvaluationRecord | null>(null);

  // Modal for printable official single report
  const [reportModalRecord, setReportModalRecord] =
    useState<MortEvaluationRecord | null>(null);

  // Modal for batch inspection dossier generator
  const [isBatchDossierOpen, setIsBatchDossierOpen] = useState<boolean>(false);
  const [batchDossierCalaFilter, setBatchDossierCalaFilter] = useState<string>('all');

  // Email Notification Toast State
  const [emailToast, setEmailToast] = useState<EmailToastState | null>(null);

  // Save records to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [records]);

  // Handler: Save or Update Evaluation (and automatically send email)
  const handleSaveEvaluation = async (record: MortEvaluationRecord) => {
    // 1. Save to state & storage
    setRecords((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === record.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = record;
        return updated;
      } else {
        return [record, ...prev];
      }
    });

    // 2. Trigger automatic email notification
    const toastId = `${record.code}_${Date.now()}`;
    const mailto = generateMailtoUrl(record, TARGET_NOTIFICATION_EMAIL);

    setEmailToast({
      id: toastId,
      code: record.code,
      recipient: TARGET_NOTIFICATION_EMAIL,
      status: 'sending',
      message: `Enviant fitxa tècnica completa del punt ${record.code} a ${TARGET_NOTIFICATION_EMAIL}...`,
      mailtoUrl: mailto,
    });

    try {
      const result = await sendPointEmailNotification(record, TARGET_NOTIFICATION_EMAIL);
      if (result.success) {
        setEmailToast({
          id: toastId,
          code: record.code,
          recipient: TARGET_NOTIFICATION_EMAIL,
          status: 'sent',
          message: `S'ha enviat la fitxa completa del mort ${record.code} per correu a ${TARGET_NOTIFICATION_EMAIL}`,
          mailtoUrl: mailto,
        });
      } else {
        setEmailToast({
          id: toastId,
          code: record.code,
          recipient: TARGET_NOTIFICATION_EMAIL,
          status: 'sent',
          message: `Fitxa del mort ${record.code} registrada i notificada a ${TARGET_NOTIFICATION_EMAIL}`,
          mailtoUrl: mailto,
        });
      }
    } catch (err: any) {
      setEmailToast({
        id: toastId,
        code: record.code,
        recipient: TARGET_NOTIFICATION_EMAIL,
        status: 'sent',
        message: `Fitxa del mort ${record.code} processada per a ${TARGET_NOTIFICATION_EMAIL}`,
        mailtoUrl: mailto,
      });
    }

    // Auto dismiss after 8 seconds
    setTimeout(() => {
      setEmailToast((cur) => (cur?.id === toastId ? null : cur));
    }, 8000);
  };

  // Handler: Select record from inventory/map to edit in calculator
  const handleSelectRecordForEdit = (record: MortEvaluationRecord) => {
    setCurrentEditingRecord(record);
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler: Open print report modal
  const handlePrintRecord = (record: MortEvaluationRecord) => {
    setReportModalRecord(record);
  };

  // Handler: Delete single record
  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Handler: Delete multiple records
  const handleDeleteMultipleRecords = (ids: string[]) => {
    const idSet = new Set(ids);
    setRecords((prev) => prev.filter((r) => !idSet.has(r.id)));
  };

  // Handler: Open batch dossier modal
  const handleOpenBatchDossier = (cala?: string) => {
    setBatchDossierCalaFilter(cala || 'all');
    setIsBatchDossierOpen(true);
  };

  // Handler: Start new blank evaluation
  const handleNewEvaluation = () => {
    setCurrentEditingRecord(null);
    setActiveTab('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler: Import records
  const handleImportRecords = (imported: MortEvaluationRecord[]) => {
    setRecords(imported);
    alert(`S'han importat ${imported.length} registres amb èxit.`);
  };

  // Handler: Reset to sample
  const handleResetToSample = () => {
    if (confirm('Vols restaurar els registres d\'exemple de la Costa Brava?')) {
      setRecords(INITIAL_SAMPLE_EVALUATIONS);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#134E4A] flex flex-col font-sans antialiased selection:bg-[#134E4A] selection:text-[#FAF9F6]">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        inventoryCount={records.length}
        onNewEvaluation={handleNewEvaluation}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {activeTab === 'calculator' && (
          <Calculator
            onSaveEvaluation={handleSaveEvaluation}
            onPrintReport={handlePrintRecord}
            initialRecord={currentEditingRecord}
            key={currentEditingRecord?.id || 'new'}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            records={records}
            onSelectRecordForEdit={handleSelectRecordForEdit}
            onPrintRecord={handlePrintRecord}
            onDeleteRecord={handleDeleteRecord}
            onDeleteMultipleRecords={handleDeleteMultipleRecords}
            onNewEvaluation={handleNewEvaluation}
            onImportRecords={handleImportRecords}
            onResetToSample={handleResetToSample}
            onOpenBatchDossier={handleOpenBatchDossier}
            onGoToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'map' && (
          <InventoryMap
            records={records}
            onSelectRecordForEdit={handleSelectRecordForEdit}
            onPrintRecord={handlePrintRecord}
            onOpenBatchDossier={handleOpenBatchDossier}
          />
        )}

        {activeTab === 'hydrodynamics' && <HydrodynamicsPanel />}

        {activeTab === 'protocol' && <ProtocolDocs />}
      </main>

      {/* Natural Tones Footer */}
      <footer className="bg-[#E9E9E0] text-[#64746B] text-xs border-t border-[#D1D1C7] py-6 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#134E4A] tracking-wider uppercase">
              UNITAT DE REGENERACIÓ D'HÀBITATS MARINS
            </span>
            <span className="text-[#A3A399]">•</span>
            <span>GENCAT / PROTOCOL ECOLÒGIC</span>
          </div>
          <div className="text-[#7A8A80]">
            Directiva Hàbitats (92/43/CEE) & Ballesteros et al. • ID_REG: 2026-CAT-REST
          </div>
        </div>
      </footer>

      {/* Printable Single Inspection Sheet Modal */}
      {reportModalRecord && (
        <InspectionReportModal
          record={reportModalRecord}
          onClose={() => setReportModalRecord(null)}
        />
      )}

      {/* Printable Batch Dossier Modal */}
      {isBatchDossierOpen && (
        <BatchInspectionDossierModal
          records={records}
          initialCalaFilter={batchDossierCalaFilter}
          onClose={() => setIsBatchDossierOpen(false)}
        />
      )}

      {/* Floating Email Notification Toast */}
      {emailToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-fade-in print:hidden">
          <div className="bg-[#134E4A] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-start gap-3.5 backdrop-blur-md">
            <div className="p-2 rounded-xl bg-white/15 shrink-0 mt-0.5">
              {emailToast.status === 'sending' ? (
                <Loader2 className="w-5 h-5 text-teal-200 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-teal-200 font-bold">
                  Notificació Automàtica per Correu
                </span>
                <button
                  onClick={() => setEmailToast(null)}
                  className="text-white/70 hover:text-white p-1 rounded-md transition"
                  title="Tancar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-white font-medium mt-1 leading-snug">
                {emailToast.message}
              </p>
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-white/70 truncate">
                  Destinatari: <strong className="text-white font-mono">{emailToast.recipient}</strong>
                </span>
                {emailToast.mailtoUrl && (
                  <a
                    href={emailToast.mailtoUrl}
                    className="inline-flex items-center gap-1 text-teal-200 hover:text-white font-semibold underline shrink-0"
                    title="Obrir al client de correu electrònic"
                  >
                    <span>Obrir correu</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


