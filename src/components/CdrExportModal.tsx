import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Check,
  Calendar,
  Layers,
  Settings2,
  Filter,
  DollarSign,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Clock,
  PhoneCall
} from 'lucide-react';
import { CDRRecord } from '../types/pbx';
import {
  ALL_CDR_COLUMNS,
  PRESET_PROFILES,
  CdrExportOptions,
  CdrExportDelimiter,
  CdrDatePreset,
  CdrDirectionFilter,
  CdrPresetProfile,
  generateCdrCsvReport,
  downloadCdrCsvFile,
  filterCdrRecordsByOptions,
  formatSecondsToMinutes
} from '../utils/cdrReportExport';

interface CdrExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredRecords: CDRRecord[];
  allRecords: CDRRecord[];
  onExportSuccess: (filename: string, recordCount: number) => void;
}

export const CdrExportModal: React.FC<CdrExportModalProps> = ({
  isOpen,
  onClose,
  filteredRecords,
  allRecords,
  onExportSuccess
}) => {
  // State
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [datePreset, setDatePreset] = useState<CdrDatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [directionFilter, setDirectionFilter] = useState<CdrDirectionFilter>('all');
  const [delimiter, setDelimiter] = useState<CdrExportDelimiter>(';');
  const [includeKpiSummary, setIncludeKpiSummary] = useState(true);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [activeProfile, setActiveProfile] = useState<CdrPresetProfile>('full');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    PRESET_PROFILES.full.columns
  );
  const [customFilename, setCustomFilename] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return `report_cdr_chiamate_${today}.csv`;
  });

  // Calculate dataset to export based on scope & options
  const baseDataset = scope === 'filtered' ? filteredRecords : allRecords;
  const finalFiltered = useMemo(() => {
    return filterCdrRecordsByOptions(baseDataset, {
      datePreset,
      customStartDate,
      customEndDate,
      directionFilter
    });
  }, [baseDataset, datePreset, customStartDate, customEndDate, directionFilter]);

  // Total billable seconds
  const totalBillableSec = useMemo(() => {
    return finalFiltered.reduce((acc, r) => acc + r.billsec, 0);
  }, [finalFiltered]);

  const handleSelectProfile = (profileKey: CdrPresetProfile) => {
    setActiveProfile(profileKey);
    setSelectedColumns(PRESET_PROFILES[profileKey].columns);
  };

  const handleToggleColumn = (colId: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(colId)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((id) => id !== colId);
      } else {
        return [...prev, colId];
      }
    });
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(ALL_CDR_COLUMNS.map((c) => c.id));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns(['callDate', 'src', 'dst', 'durationFormatted', 'dispositionDesc']);
  };

  const handleExecuteExport = () => {
    const options: CdrExportOptions = {
      filename: customFilename.trim() || undefined,
      delimiter,
      includeKpiSummary,
      includeHeaders,
      selectedColumns,
      scope,
      datePreset,
      customStartDate,
      customEndDate,
      directionFilter
    };

    const result = generateCdrCsvReport(baseDataset, options);
    downloadCdrCsvFile(result.csvString, customFilename.trim() || undefined);
    onExportSuccess(customFilename.trim() || 'report_cdr.csv', result.totalRecords);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Esportazione Report Chiamate (CDR CSV)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Excel & BI Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Genera ed esporta lo storico delle chiamate con tracciamento SLA, costi stimati e metriche di qualità MOS.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-6 text-xs text-slate-300 max-h-[65vh] overflow-y-auto pr-1">
          {/* Section 1: Ambito Dataset & Filtro Direzione */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>1. Ambito Chiamate da Includere</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setScope('filtered')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'filtered'
                    ? 'bg-sky-500/10 border-sky-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                  className="mt-0.5 text-sky-500"
                />
                <div>
                  <div className="font-semibold text-xs text-slate-200">
                    Solo chiamate filtrate a video ({filteredRecords.length})
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Esporta solo le righe che corrispondono ai filtri di ricerca correnti.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setScope('all')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  scope === 'all'
                    ? 'bg-sky-500/10 border-sky-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="mt-0.5 text-sky-500"
                />
                <div>
                  <div className="font-semibold text-xs text-slate-200">
                    Tutto lo storico CDR ({allRecords.length})
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Esporta l'intero registro storico completo archiviato nel centralino.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Filtro Data & Direzione */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Periodo & Direzione Chiamata</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Preset */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Periodo Temporale</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as CdrDatePreset)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                >
                  <option value="all">Tutte le date registrate</option>
                  <option value="today">Oggi</option>
                  <option value="7days">Ultimi 7 giorni</option>
                  <option value="30days">Ultimi 30 giorni</option>
                  <option value="month">Mese corrente</option>
                  <option value="custom">Intervallo personalizzato...</option>
                </select>
              </div>

              {/* Direction Filter */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Direzione del Traffico</label>
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value as CdrDirectionFilter)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                >
                  <option value="all">Tutte le direzioni (In entrata, In uscita, Interne)</option>
                  <option value="inbound">Solo chiamate in entrata (Inbound)</option>
                  <option value="outbound">Solo chiamate in uscita (Outbound)</option>
                  <option value="internal">Solo chiamate interne tra interni</option>
                </select>
              </div>
            </div>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Da data (Inizio)</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">A data (Fine)</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Profili & Selezione Colonne */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-sky-400" />
                <span>3. Colonne e Profilo di Esportazione</span>
              </h4>
              <span className="text-[11px] text-sky-400 font-mono font-bold">
                {selectedColumns.length} di {ALL_CDR_COLUMNS.length} colonne selezionate
              </span>
            </div>

            {/* Profiles selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(PRESET_PROFILES) as CdrPresetProfile[]).map((pKey) => {
                const profile = PRESET_PROFILES[pKey];
                const isActive = activeProfile === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => handleSelectProfile(pKey)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      isActive
                        ? 'bg-sky-600/20 border-sky-500/60 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{profile.name.split(' ')[1] || profile.name}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{profile.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Quick selectors */}
            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
              <span>Personalizza le colonne incluse nel file:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-sky-400 hover:text-sky-300 underline"
                >
                  Seleziona Tutte
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllColumns}
                  className="text-slate-400 hover:text-slate-300 underline"
                >
                  Campi Essenziali
                </button>
              </div>
            </div>

            {/* Checkbox grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
              {ALL_CDR_COLUMNS.map((col) => {
                const isChecked = selectedColumns.includes(col.id);
                return (
                  <label
                    key={col.id}
                    className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition select-none ${
                      isChecked ? 'text-slate-200' : 'text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleColumn(col.id)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                    />
                    <span className="text-[11px] truncate">{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 4: Formato CSV & Opzioni Reporting */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-sky-400" />
              <span>4. Formattazione CSV & Metadati Report</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Delimiter */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">
                  Separatore Colonne CSV
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDelimiter(';')}
                    className={`p-2 rounded-xl border text-center transition ${
                      delimiter === ';'
                        ? 'bg-sky-600/20 border-sky-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs">Punto e Virgola ( ; )</div>
                    <div className="text-[10px] text-slate-400">Excel Italia / UE</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDelimiter(',')}
                    className={`p-2 rounded-xl border text-center transition ${
                      delimiter === ','
                        ? 'bg-sky-600/20 border-sky-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs">Virgola ( , )</div>
                    <div className="text-[10px] text-slate-400">Standard RFC / US</div>
                  </button>
                </div>
              </div>

              {/* Filename */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">
                  Nome File di Esportazione
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeKpiSummary}
                  onChange={(e) => setIncludeKpiSummary(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500"
                />
                <span>
                  <strong>Includi Intestazione Riepilogo Esecutivo (Executive KPI Summary)</strong>
                  <span className="text-slate-400 ml-1">
                    (aggiunge righe di commento iniziale con statistiche aggregate: tasso risposte, durata totale, MOS)
                  </span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-sky-500"
                />
                <span>Includi riga dei titoli delle colonne (Header row)</span>
              </label>
            </div>
          </div>

          {/* Section 5: Anteprima Sintetica Risultato */}
          <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white">
                  {finalFiltered.length} chiamate pronte per l'esportazione
                </div>
                <div className="text-[11px] text-slate-400">
                  Conversazione totale: <strong className="text-sky-300">{formatSecondsToMinutes(totalBillableSec)}</strong> ({totalBillableSec}s) • Encoding UTF-8 con BOM per Excel
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Formato: <strong className="text-white">{delimiter === ';' ? 'CSV ( ; )' : 'CSV ( , )'}</strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Annulla
          </button>

          <button
            id="btn-confirm-export-csv"
            type="button"
            onClick={handleExecuteExport}
            disabled={finalFiltered.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
              finalFiltered.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30 cursor-pointer'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Scarica Report CSV ({finalFiltered.length} Record)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
