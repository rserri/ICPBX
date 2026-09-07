import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  Download,
  Play,
  Pause,
  Filter,
  CheckCircle,
  XCircle,
  PhoneOff,
  AlertTriangle,
  Disc,
  Headphones,
  FileSpreadsheet,
  Settings2,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneForwarded,
  X,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { CDRRecord, CallDisposition } from '../types/pbx';
import { CdrExportModal } from './CdrExportModal';
import {
  generateCdrCsvReport,
  downloadCdrCsvFile,
  detectCallDirection,
  formatSecondsToMinutes,
  getMosRatingLabel,
  PRESET_PROFILES
} from '../utils/cdrReportExport';

interface CdrManagerProps {
  cdrRecords: CDRRecord[];
}

export const CdrManager: React.FC<CdrManagerProps> = ({ cdrRecords }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dispositionFilter, setDispositionFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound' | 'internal'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Export modal and feedback toast
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportToast, setExportToast] = useState<{ message: string; filename: string } | null>(null);

  const filteredRecords = useMemo(() => {
    return cdrRecords.filter((rec) => {
      const matchesSearch =
        rec.src.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.dst.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.clid.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDisposition =
        dispositionFilter === 'ALL' || rec.disposition === dispositionFilter;

      let matchesDirection = true;
      if (directionFilter !== 'all') {
        const dir = detectCallDirection(rec.src, rec.dst);
        if (directionFilter === 'inbound' && dir !== 'Inbound') matchesDirection = false;
        if (directionFilter === 'outbound' && dir !== 'Outbound') matchesDirection = false;
        if (directionFilter === 'internal' && dir !== 'Internal') matchesDirection = false;
      }

      return matchesSearch && matchesDisposition && matchesDirection;
    });
  }, [cdrRecords, searchTerm, dispositionFilter, directionFilter]);

  // KPI calculations for reporting
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const answered = filteredRecords.filter((r) => r.disposition === 'ANSWERED').length;
    const answerRate = total > 0 ? Math.round((answered / total) * 100) : 0;
    const totalBillSec = filteredRecords.reduce((acc, r) => acc + r.billsec, 0);
    const avgMos =
      total > 0
        ? (filteredRecords.reduce((acc, r) => acc + r.mosScore, 0) / total).toFixed(2)
        : '0.00';

    return {
      total,
      answered,
      answerRate,
      totalBillSec,
      avgMos
    };
  }, [filteredRecords]);

  const handleTogglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      setPlaybackProgress(0);
      const interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setPlayingId(null);
            return 0;
          }
          return prev + 5;
        });
      }, 300);
    }
  };

  // Quick 1-click export using standard Italian Excel format (';', with BOM & KPI summary)
  const handleQuickExportCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `report_cdr_${today}.csv`;
    const result = generateCdrCsvReport(filteredRecords, {
      filename,
      delimiter: ';',
      includeKpiSummary: true,
      includeHeaders: true,
      selectedColumns: PRESET_PROFILES.full.columns,
      scope: 'filtered',
      datePreset: 'all',
      directionFilter: 'all'
    });

    downloadCdrCsvFile(result.csvString, filename);
    setExportToast({
      message: `${result.totalRecords} record esportati con successo nel formato report CSV (Excel ;).`,
      filename
    });

    setTimeout(() => {
      setExportToast(null);
    }, 6000);
  };

  const handleExportSuccess = (filename: string, recordCount: number) => {
    setExportToast({
      message: `${recordCount} record esportati con successo nel report personalizzato.`,
      filename
    });
    setTimeout(() => {
      setExportToast(null);
    }, 6000);
  };

  const getDispositionBadge = (disp: CallDisposition) => {
    switch (disp) {
      case 'ANSWERED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3 h-3" />
            <span>Risposta</span>
          </span>
        );
      case 'NO ANSWER':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950 text-amber-300 border border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Non Risposta</span>
          </span>
        );
      case 'BUSY':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-950 text-purple-300 border border-purple-800">
            <PhoneOff className="w-3 h-3" />
            <span>Occupato</span>
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3" />
            <span>Fallita</span>
          </span>
        );
    }
  };

  const getDirectionBadge = (src: string, dst: string) => {
    const dir = detectCallDirection(src, dst);
    switch (dir) {
      case 'Inbound':
        return (
          <span
            title="Chiamata in entrata da linea esterna"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-950/60 text-sky-400 border border-sky-800/60"
          >
            <PhoneIncoming className="w-2.5 h-2.5" />
            <span>Entrata</span>
          </span>
        );
      case 'Outbound':
        return (
          <span
            title="Chiamata in uscita verso rete pubblica"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
          >
            <PhoneOutgoing className="w-2.5 h-2.5" />
            <span>Uscita</span>
          </span>
        );
      case 'Internal':
      default:
        return (
          <span
            title="Chiamata interna tra estensioni del PBX"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/60 text-purple-400 border border-purple-800/60"
          >
            <PhoneForwarded className="w-2.5 h-2.5" />
            <span>Interna</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <span>Registro Chiamate & CDR Asterisk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log dettagliati delle chiamate in entrata, uscita e tra interni con ascolto registrazioni audio, analisi MOS ed esportazione per reportistica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Export Button */}
          <button
            id="btn-export-cdr-csv"
            onClick={handleQuickExportCsv}
            title="Esporta rapidamente le chiamate visibili in CSV con separatore Excel (;)"
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Esporta CSV</span>
          </button>

          {/* Advanced Report Config Modal Button */}
          <button
            id="btn-open-cdr-report-modal"
            onClick={() => setIsExportModalOpen(true)}
            title="Personalizza colonne, periodo di date, delimitatore e sommario esecutivo"
            className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Opzioni Report CSV...</span>
          </button>
        </div>
      </div>

      {/* Export Confirmation Toast */}
      {exportToast && (
        <div className="bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>Report CSV Generato con Successo!</span>
                <span className="font-mono text-[10px] bg-emerald-900/80 px-2 py-0.5 rounded text-emerald-300">
                  {exportToast.filename}
                </span>
              </div>
              <div className="text-emerald-300/80 text-[11px] mt-0.5">{exportToast.message}</div>
            </div>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="p-1 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-900/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards for Reporting */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Totale Chiamate
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics.total}</span>
            <span className="text-[11px] text-slate-500">
              {metrics.total === cdrRecords.length ? 'totali' : `di ${cdrRecords.length}`}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Registrate nel database CDR</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tasso di Risposta (SLA)
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{metrics.answerRate}%</span>
            <span className="text-[11px] text-slate-500">({metrics.answered} risposte)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Chiamate gestite con successo</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Durata Conversazione
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400">
              {formatSecondsToMinutes(metrics.totalBillSec)}
            </span>
            <span className="text-[11px] text-slate-500">({metrics.totalBillSec}s)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Traffico vocale effettivo fatturato</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Qualità Media MOS
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{metrics.avgMos}</span>
            <span className="text-[11px] text-slate-500">/ 5.00</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Valutazione: <strong className="text-slate-300">{getMosRatingLabel(Number(metrics.avgMos))}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="search-cdr"
              type="text"
              placeholder="Cerca per numero, interno o mittente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Disposition filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Esito:</span>
            </span>
            {(['ALL', 'ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED'] as const).map((disp) => (
              <button
                key={disp}
                onClick={() => setDispositionFilter(disp)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  dispositionFilter === disp
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {disp === 'ALL'
                  ? 'Tutti'
                  : disp === 'ANSWERED'
                  ? 'Risposte'
                  : disp === 'NO ANSWER'
                  ? 'Perse'
                  : disp === 'BUSY'
                  ? 'Occupato'
                  : 'Fallite'}
              </button>
            ))}
          </div>
        </div>

        {/* Direction filter line */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Direzione:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  directionFilter === 'all'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tutte ({cdrRecords.length})
              </button>
              <button
                onClick={() => setDirectionFilter('inbound')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  directionFilter === 'inbound'
                    ? 'bg-sky-600/30 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PhoneIncoming className="w-3 h-3" />
                <span>In Entrata</span>
              </button>
              <button
                onClick={() => setDirectionFilter('outbound')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  directionFilter === 'outbound'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PhoneOutgoing className="w-3 h-3" />
                <span>In Uscita</span>
              </button>
              <button
                onClick={() => setDirectionFilter('internal')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  directionFilter === 'internal'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PhoneForwarded className="w-3 h-3" />
                <span>Interne</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Visualizzate <strong className="text-slate-200">{filteredRecords.length}</strong> su {cdrRecords.length} chiamate
          </div>
        </div>
      </div>

      {/* CDR Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Data & Ora</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Mittente (Caller ID)</th>
                <th className="py-3 px-4">Destinazione</th>
                <th className="py-3 px-4">Durata</th>
                <th className="py-3 px-4">Esito</th>
                <th className="py-3 px-4">Qualità MOS</th>
                <th className="py-3 px-4">Registrazione Audio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nessuna chiamata corrisponde ai criteri di ricerca impostati.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {rec.callDate}
                    </td>

                    {/* Direction badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getDirectionBadge(rec.src, rec.dst)}
                    </td>

                    {/* Caller */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{rec.src}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{rec.clid}</div>
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {rec.dst}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 font-mono">
                      <span className="text-white font-semibold">{rec.billsec}s</span>
                      <span className="text-[10px] text-slate-500 ml-1">(tot. {rec.duration}s)</span>
                    </td>

                    {/* Disposition */}
                    <td className="py-3 px-4">
                      {getDispositionBadge(rec.disposition)}
                    </td>

                    {/* MOS score */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <span
                          className={`font-bold ${
                            rec.mosScore >= 4.3
                              ? 'text-emerald-400'
                              : rec.mosScore >= 4.0
                              ? 'text-sky-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {rec.mosScore.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">/ 5.0</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{rec.codec}</div>
                    </td>

                    {/* Recording Player */}
                    <td className="py-3 px-4">
                      {rec.hasRecording ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTogglePlay(rec.id)}
                            className={`p-1.5 rounded-lg transition ${
                              playingId === rec.id
                                ? 'bg-sky-600 text-white animate-pulse'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                            }`}
                          >
                            {playingId === rec.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex-1 min-w-[80px]">
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-sky-500 transition-all"
                                style={{ width: `${playingId === rec.id ? playbackProgress : 0}%` }}
                              ></div>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono block mt-0.5 truncate">
                              {rec.recordingFile}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600">Nessuna</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options Modal */}
      <CdrExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredRecords={filteredRecords}
        allRecords={cdrRecords}
        onExportSuccess={handleExportSuccess}
      />
    </div>
  );
};

