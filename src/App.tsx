import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Calculator } from './components/Calculator';
import { InventoryManager } from './components/InventoryManager';
import { InventoryMap } from './components/InventoryMap';
import { HydrodynamicsPanel } from './components/HydrodynamicsPanel';
import { ProtocolDocs } from './components/ProtocolDocs';
import { InspectionReportModal } from './components/InspectionReportModal';
import { BatchInspectionDossierModal } from './components/BatchInspectionDossierModal';
import { BatchAnalysisSection } from './components/BatchAnalysisSection';
import { MortEvaluationRecord } from './types';
import {
  getStoredDriveToken,
  setStoredDriveToken,
  clearStoredDriveToken,
  requestGoogleDriveAuth,
  loadInventoryFromDrive,
  saveInventoryToDrive,
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_URL,
} from './utils/googleDriveService';

const STORAGE_KEY = 'morts_fondeig_evaluations_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'calculator' | 'inventory' | 'batch' | 'map' | 'hydrodynamics' | 'protocol'
  >('calculator');

  // Inventory records initialized from local storage (empty array by default, no sample points loaded)
  const [records, setRecords] = useState<MortEvaluationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Exclude any previously cached simulated sample points
          const userRecords = parsed.filter(
            (r: MortEvaluationRecord) => !r.id?.startsWith('sim_mort_')
          );
          return userRecords;
        }
      }
    } catch (e) {
      console.error('Error loading from localStorage', e);
    }
    return [];
  });

  // Google Drive Sync State
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(() => {
    return !!getStoredDriveToken();
  });
  const [driveUserEmail, setDriveUserEmail] = useState<string | undefined>(() => {
    return sessionStorage.getItem('gdrive_user_email') || undefined;
  });
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [driveAutoSync, setDriveAutoSync] = useState<boolean>(true);
  const [driveLastSyncTime, setDriveLastSyncTime] = useState<string | undefined>(() => {
    return localStorage.getItem('gdrive_last_sync_time') || undefined;
  });
  const [driveError, setDriveError] = useState<string | null>(null);

  // Current record in calculator
  const [currentEditingRecord, setCurrentEditingRecord] =
    useState<MortEvaluationRecord | null>(null);

  // Modal for printable official single report
  const [reportModalRecord, setReportModalRecord] =
    useState<MortEvaluationRecord | null>(null);

  // Modal for batch inspection dossier generator
  const [isBatchDossierOpen, setIsBatchDossierOpen] = useState<boolean>(false);
  const [batchDossierCalaFilter, setBatchDossierCalaFilter] = useState<string>('all');

  // Save records to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [records]);

  // Pull initial records from Drive if connected on mount
  useEffect(() => {
    const token = getStoredDriveToken();
    if (token) {
      setIsDriveConnected(true);
      (async () => {
        try {
          setIsDriveSyncing(true);
          const result = await loadInventoryFromDrive(token);
          if (result.records && result.records.length > 0) {
            setRecords(result.records);
            const now = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
            setDriveLastSyncTime(now);
            localStorage.setItem('gdrive_last_sync_time', now);
          }
        } catch (err: any) {
          console.warn('Initial Drive sync check:', err);
        } finally {
          setIsDriveSyncing(false);
        }
      })();
    }
  }, []);

  // Helper to push to Google Drive
  const pushRecordsToDrive = useCallback(
    async (recordsToSave: MortEvaluationRecord[]) => {
      const token = getStoredDriveToken();
      if (!token) return;

      try {
        setIsDriveSyncing(true);
        setDriveError(null);
        await saveInventoryToDrive(recordsToSave, token, GOOGLE_DRIVE_FOLDER_ID);
        const now = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
        setDriveLastSyncTime(now);
        localStorage.setItem('gdrive_last_sync_time', now);
      } catch (err: any) {
        console.error('Auto-save to Google Drive error:', err);
        setDriveError(`Error al desar a Google Drive: ${err.message || err}`);
      } finally {
        setIsDriveSyncing(false);
      }
    },
    []
  );

  // Google Drive Connect Handler
  const handleConnectDrive = async () => {
    try {
      setIsDriveSyncing(true);
      setDriveError(null);
      const authRes = await requestGoogleDriveAuth();
      setIsDriveConnected(true);
      if (authRes.userEmail) {
        setDriveUserEmail(authRes.userEmail);
      }

      // Load existing records from folder
      const result = await loadInventoryFromDrive(authRes.accessToken);
      if (result.records && result.records.length > 0) {
        setRecords(result.records);
        alert(`S'han carregat ${result.records.length} registres de la carpeta de Google Drive.`);
      } else if (records.length > 0) {
        // If Drive is empty but local has records, push to Drive
        await saveInventoryToDrive(records, authRes.accessToken);
      }

      const now = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      setDriveLastSyncTime(now);
      localStorage.setItem('gdrive_last_sync_time', now);
    } catch (err: any) {
      console.error('Google Drive Auth error:', err);
      setDriveError(`No s'ha pogut connectar amb Google Drive: ${err.message || err}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Google Drive Disconnect Handler
  const handleDisconnectDrive = () => {
    clearStoredDriveToken();
    setIsDriveConnected(false);
    setDriveUserEmail(undefined);
    setDriveError(null);
  };

  // Manual Bidirectional Sync
  const handleManualDriveSync = async () => {
    const token = getStoredDriveToken();
    if (!token) {
      handleConnectDrive();
      return;
    }

    try {
      setIsDriveSyncing(true);
      setDriveError(null);
      // Fetch latest
      const driveData = await loadInventoryFromDrive(token);
      
      // Merge or update
      if (driveData.records.length > 0) {
        setRecords(driveData.records);
        alert(`Sincronització completada: ${driveData.records.length} registres actualitzats des de Google Drive.`);
      } else {
        // Push local to Drive
        await saveInventoryToDrive(records, token);
        alert(`S'han guardat ${records.length} registres a la carpeta de Google Drive.`);
      }

      const now = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      setDriveLastSyncTime(now);
      localStorage.setItem('gdrive_last_sync_time', now);
    } catch (err: any) {
      setDriveError(`Error de sincronització: ${err.message || err}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Pull records from Drive
  const handlePullFromDrive = async () => {
    const token = getStoredDriveToken();
    if (!token) {
      handleConnectDrive();
      return;
    }
    try {
      setIsDriveSyncing(true);
      setDriveError(null);
      const data = await loadInventoryFromDrive(token);
      setRecords(data.records);
      const now = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      setDriveLastSyncTime(now);
      localStorage.setItem('gdrive_last_sync_time', now);
      alert(`S'han descarregat ${data.records.length} registres des de Google Drive.`);
    } catch (err: any) {
      setDriveError(`Error en carregar de Google Drive: ${err.message || err}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Push records to Drive
  const handlePushToDrive = async () => {
    const token = getStoredDriveToken();
    if (!token) {
      handleConnectDrive();
      return;
    }
    try {
      setIsDriveSyncing(true);
      setDriveError(null);
      await saveInventoryToDrive(records, token);
      const now = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      setDriveLastSyncTime(now);
      localStorage.setItem('gdrive_last_sync_time', now);
      alert(`S'han guardat ${records.length} registres a Google Drive amb èxit.`);
    } catch (err: any) {
      setDriveError(`Error en desar a Google Drive: ${err.message || err}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Manual Token handler
  const handleSetManualToken = async (token: string) => {
    setStoredDriveToken(token, 7200);
    setIsDriveConnected(true);
    try {
      setIsDriveSyncing(true);
      const data = await loadInventoryFromDrive(token);
      if (data.records && data.records.length > 0) {
        setRecords(data.records);
      }
      const now = new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
      setDriveLastSyncTime(now);
      localStorage.setItem('gdrive_last_sync_time', now);
      alert('Token aplicat i connexió amb Google Drive establerta correctament.');
    } catch (err: any) {
      setDriveError(`Error amb el token manual: ${err.message || err}`);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Handler: Save or Update Evaluation (and automatically sync Drive)
  const handleSaveEvaluation = async (record: MortEvaluationRecord) => {
    let updatedRecords: MortEvaluationRecord[] = [];

    // 1. Save to state & storage
    setRecords((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === record.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = record;
        updatedRecords = updated;
        return updated;
      } else {
        const updated = [record, ...prev];
        updatedRecords = updated;
        return updated;
      }
    });

    // 2. Auto-sync to Google Drive if active
    if (driveAutoSync && isDriveConnected) {
      pushRecordsToDrive(updatedRecords.length > 0 ? updatedRecords : [record, ...records]);
    }
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
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    if (driveAutoSync && isDriveConnected) {
      pushRecordsToDrive(updated);
    }
  };

  // Handler: Delete multiple records
  const handleDeleteMultipleRecords = (ids: string[]) => {
    const idSet = new Set(ids);
    const updated = records.filter((r) => !idSet.has(r.id));
    setRecords(updated);
    if (driveAutoSync && isDriveConnected) {
      pushRecordsToDrive(updated);
    }
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
    if (driveAutoSync && isDriveConnected) {
      pushRecordsToDrive(imported);
    }
    alert(`S'han importat ${imported.length} registres amb èxit.`);
  };

  // Dynamic existing location suggestions based on inventory
  const existingLocations = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.locationName && r.locationName.trim()) {
        set.add(r.locationName.trim());
      }
    });
    return Array.from(set);
  }, [records]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#134E4A] flex flex-col font-sans antialiased selection:bg-[#134E4A] selection:text-[#FAF9F6]">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        inventoryCount={records.length}
        onNewEvaluation={handleNewEvaluation}
        isDriveConnected={isDriveConnected}
        isDriveSyncing={isDriveSyncing}
        onDriveSyncClick={() => {
          setActiveTab('inventory');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {activeTab === 'calculator' && (
          <Calculator
            onSaveEvaluation={handleSaveEvaluation}
            onPrintReport={handlePrintRecord}
            initialRecord={currentEditingRecord}
            existingLocations={existingLocations}
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
            onOpenBatchDossier={handleOpenBatchDossier}
            onGoToMap={() => setActiveTab('map')}
            isDriveConnected={isDriveConnected}
            driveUserEmail={driveUserEmail}
            isDriveSyncing={isDriveSyncing}
            driveAutoSync={driveAutoSync}
            driveLastSyncTime={driveLastSyncTime}
            driveError={driveError}
            onConnectDrive={handleConnectDrive}
            onDisconnectDrive={handleDisconnectDrive}
            onManualDriveSync={handleManualDriveSync}
            onPullFromDrive={handlePullFromDrive}
            onPushToDrive={handlePushToDrive}
            onToggleAutoSync={setDriveAutoSync}
            onSetManualToken={handleSetManualToken}
          />
        )}

        {activeTab === 'batch' && (
          <BatchAnalysisSection
            onImportToInventory={(newBatchRecords) => {
              setRecords((prev) => {
                const combined = [...prev, ...newBatchRecords];
                if (isDriveConnected && driveAutoSync) {
                  pushRecordsToDrive(combined);
                }
                return combined;
              });
            }}
            onGoToInventory={() => {
              setActiveTab('inventory');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isDriveConnected={isDriveConnected}
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
    </div>
  );
}


