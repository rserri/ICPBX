import { CDRRecord } from '../types/pbx';

export type CdrExportDelimiter = ';' | ',';
export type CdrDatePreset = 'all' | 'today' | '7days' | '30days' | 'month' | 'custom';
export type CdrDirectionFilter = 'all' | 'inbound' | 'outbound' | 'internal';
export type CdrPresetProfile = 'full' | 'billing' | 'quality' | 'management';

export interface CdrExportColumn {
  id: string;
  label: string;
  category: 'base' | 'timing' | 'quality' | 'technical' | 'billing';
  getter: (r: CDRRecord) => string | number;
}

export interface CdrExportOptions {
  filename?: string;
  delimiter: CdrExportDelimiter;
  includeKpiSummary: boolean;
  includeHeaders: boolean;
  selectedColumns: string[];
  scope: 'filtered' | 'all';
  datePreset: CdrDatePreset;
  customStartDate?: string;
  customEndDate?: string;
  directionFilter: CdrDirectionFilter;
  costRates?: {
    landlineRatePerMin: number; // € / min
    mobileRatePerMin: number;   // € / min
  };
}

export const detectCallDirection = (src: string, dst: string): 'Inbound' | 'Outbound' | 'Internal' => {
  const isSrcExternal = src.startsWith('+') || src.length > 5 || src.toLowerCase() === 'anonymous';
  const isDstExternal = dst.startsWith('+') || dst.length > 5;

  if (isSrcExternal && !isDstExternal) return 'Inbound';
  if (!isSrcExternal && isDstExternal) return 'Outbound';
  return 'Internal';
};

export const formatSecondsToMinutes = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const getMosRatingLabel = (score: number): string => {
  if (score >= 4.3) return 'Eccellente';
  if (score >= 4.0) return 'Buono';
  if (score >= 3.6) return 'Accettabile';
  return 'Scarso';
};

export const calculateCallCost = (
  rec: CDRRecord,
  rates = { landlineRatePerMin: 0.02, mobileRatePerMin: 0.08 }
): number => {
  if (rec.billsec <= 0) return 0;
  const direction = detectCallDirection(rec.src, rec.dst);
  if (direction !== 'Outbound') return 0;

  const minutes = Math.ceil(rec.billsec / 60);
  const isMobile = rec.dst.startsWith('+393') || rec.dst.startsWith('3');
  const rate = isMobile ? rates.mobileRatePerMin : rates.landlineRatePerMin;
  return Number((minutes * rate).toFixed(2));
};

export const ALL_CDR_COLUMNS: CdrExportColumn[] = [
  {
    id: 'id',
    label: 'ID Chiamata (UniqueID)',
    category: 'base',
    getter: (r) => r.id
  },
  {
    id: 'callDate',
    label: 'Data e Ora Completa',
    category: 'base',
    getter: (r) => r.callDate
  },
  {
    id: 'dateOnly',
    label: 'Data (YYYY-MM-DD)',
    category: 'base',
    getter: (r) => r.callDate.split(' ')[0] || ''
  },
  {
    id: 'timeOnly',
    label: 'Ora (HH:mm:ss)',
    category: 'base',
    getter: (r) => r.callDate.split(' ')[1] || ''
  },
  {
    id: 'src',
    label: 'Numero Mittente',
    category: 'base',
    getter: (r) => r.src
  },
  {
    id: 'clid',
    label: 'Caller ID (Nome Mittente)',
    category: 'base',
    getter: (r) => r.clid
  },
  {
    id: 'dst',
    label: 'Numero Destinazione',
    category: 'base',
    getter: (r) => r.dst
  },
  {
    id: 'direction',
    label: 'Direzione Chiamata',
    category: 'base',
    getter: (r) => {
      const dir = detectCallDirection(r.src, r.dst);
      return dir === 'Inbound' ? 'In entrata' : dir === 'Outbound' ? 'In uscita' : 'Interna';
    }
  },
  {
    id: 'disposition',
    label: 'Esito Tecnico (Asterisk)',
    category: 'base',
    getter: (r) => r.disposition
  },
  {
    id: 'dispositionDesc',
    label: 'Esito Chiamata Descrizione',
    category: 'base',
    getter: (r) => {
      switch (r.disposition) {
        case 'ANSWERED':
          return 'Risposta';
        case 'NO ANSWER':
          return 'Non Risposta (Persa)';
        case 'BUSY':
          return 'Occupato';
        case 'FAILED':
          return 'Fallita';
        default:
          return r.disposition;
      }
    }
  },
  {
    id: 'duration',
    label: 'Durata Totale (sec)',
    category: 'timing',
    getter: (r) => r.duration
  },
  {
    id: 'durationFormatted',
    label: 'Durata Totale (mm:ss)',
    category: 'timing',
    getter: (r) => formatSecondsToMinutes(r.duration)
  },
  {
    id: 'billsec',
    label: 'Conversazione Effettiva (sec)',
    category: 'timing',
    getter: (r) => r.billsec
  },
  {
    id: 'billsecFormatted',
    label: 'Conversazione Effettiva (mm:ss)',
    category: 'timing',
    getter: (r) => formatSecondsToMinutes(r.billsec)
  },
  {
    id: 'ringTime',
    label: 'Tempo di Squillo / Attesa (sec)',
    category: 'timing',
    getter: (r) => Math.max(0, r.duration - r.billsec)
  },
  {
    id: 'mosScore',
    label: 'Punteggio MOS (1-5)',
    category: 'quality',
    getter: (r) => r.mosScore.toFixed(2)
  },
  {
    id: 'mosRating',
    label: 'Giudizio Qualità Audio',
    category: 'quality',
    getter: (r) => getMosRatingLabel(r.mosScore)
  },
  {
    id: 'codec',
    label: 'Codec Audio Voce',
    category: 'quality',
    getter: (r) => r.codec
  },
  {
    id: 'hasRecording',
    label: 'Registrazione Presente',
    category: 'quality',
    getter: (r) => (r.hasRecording ? 'Sì' : 'No')
  },
  {
    id: 'recordingFile',
    label: 'Nome File Registrazione',
    category: 'quality',
    getter: (r) => r.recordingFile || 'Nessuno'
  },
  {
    id: 'estimatedCost',
    label: 'Costo Stimato Chiamata (€)',
    category: 'billing',
    getter: (r) => calculateCallCost(r).toFixed(2)
  },
  {
    id: 'channel',
    label: 'Canale Asterisk Chiamante',
    category: 'technical',
    getter: (r) => r.channel
  },
  {
    id: 'dstchannel',
    label: 'Canale Asterisk Destinatario',
    category: 'technical',
    getter: (r) => r.dstchannel || 'N/A'
  },
  {
    id: 'dcontext',
    label: 'Contesto Dialplan',
    category: 'technical',
    getter: (r) => r.dcontext
  },
  {
    id: 'lastapp',
    label: 'Ultima Applicazione Asterisk',
    category: 'technical',
    getter: (r) => r.lastapp
  }
];

export const PRESET_PROFILES: Record<CdrPresetProfile, { name: string; description: string; columns: string[] }> = {
  full: {
    name: 'Report Completo (Tutti i Campi)',
    description: 'Esporta tutte le 25 colonne per analisi tecnica e archivio approfondito',
    columns: ALL_CDR_COLUMNS.map((c) => c.id)
  },
  billing: {
    name: 'Report Fatturazione & Traffico (Billing)',
    description: 'Orientato a contabilità, controllo costi, durata e destinazioni esterne',
    columns: ['callDate', 'src', 'clid', 'dst', 'direction', 'durationFormatted', 'billsecFormatted', 'dispositionDesc', 'estimatedCost']
  },
  quality: {
    name: 'Report Qualità Audio & SLA (QoS)',
    description: 'Orientato ad audit delle chiamate, score MOS, codec e registrazioni vocali',
    columns: ['callDate', 'src', 'dst', 'ringTime', 'billsecFormatted', 'dispositionDesc', 'mosScore', 'mosRating', 'codec', 'hasRecording', 'recordingFile']
  },
  management: {
    name: 'Report Direzionale (Management)',
    description: 'Panoramica essenziale e scattante per reportistica esecutiva',
    columns: ['dateOnly', 'timeOnly', 'src', 'clid', 'dst', 'direction', 'billsecFormatted', 'dispositionDesc']
  }
};

const escapeCsvValue = (val: string | number, delimiter: CdrExportDelimiter): string => {
  const stringVal = String(val ?? '');
  // If string contains delimiter, double quotes, or newlines, wrap in quotes and escape quotes
  if (stringVal.includes(delimiter) || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
};

export const filterCdrRecordsByOptions = (
  records: CDRRecord[],
  options: Pick<CdrExportOptions, 'datePreset' | 'customStartDate' | 'customEndDate' | 'directionFilter'>
): CDRRecord[] => {
  const now = new Date();

  return records.filter((rec) => {
    // 1. Date filtering
    const recDate = new Date(rec.callDate);
    if (!isNaN(recDate.getTime())) {
      if (options.datePreset === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        if (!rec.callDate.startsWith(todayStr)) return false;
      } else if (options.datePreset === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (recDate < sevenDaysAgo) return false;
      } else if (options.datePreset === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (recDate < thirtyDaysAgo) return false;
      } else if (options.datePreset === 'month') {
        const curYearMonth = now.toISOString().slice(0, 7);
        if (!rec.callDate.startsWith(curYearMonth)) return false;
      } else if (options.datePreset === 'custom') {
        if (options.customStartDate) {
          const start = new Date(options.customStartDate);
          if (!isNaN(start.getTime()) && recDate < start) return false;
        }
        if (options.customEndDate) {
          const end = new Date(options.customEndDate);
          // Include the entire end day up to 23:59:59
          end.setHours(23, 59, 59, 999);
          if (!isNaN(end.getTime()) && recDate > end) return false;
        }
      }
    }

    // 2. Direction filtering
    if (options.directionFilter !== 'all') {
      const dir = detectCallDirection(rec.src, rec.dst);
      if (options.directionFilter === 'inbound' && dir !== 'Inbound') return false;
      if (options.directionFilter === 'outbound' && dir !== 'Outbound') return false;
      if (options.directionFilter === 'internal' && dir !== 'Internal') return false;
    }

    return true;
  });
};

export const generateCdrCsvReport = (
  records: CDRRecord[],
  options: CdrExportOptions
): {
  csvString: string;
  totalRecords: number;
  totalBillableSec: number;
  totalDurationSec: number;
  totalCost: number;
  answeredCount: number;
  avgMos: number;
} => {
  const delimiter = options.delimiter;
  const filtered = filterCdrRecordsByOptions(records, options);

  // Compute Metrics
  const totalRecords = filtered.length;
  const totalDurationSec = filtered.reduce((acc, r) => acc + r.duration, 0);
  const totalBillableSec = filtered.reduce((acc, r) => acc + r.billsec, 0);
  const totalCost = filtered.reduce((acc, r) => acc + calculateCallCost(r, options.costRates), 0);
  const answeredCount = filtered.filter((r) => r.disposition === 'ANSWERED').length;
  const noAnswerCount = filtered.filter((r) => r.disposition === 'NO ANSWER').length;
  const busyCount = filtered.filter((r) => r.disposition === 'BUSY').length;
  const failedCount = filtered.filter((r) => r.disposition === 'FAILED').length;
  const answerRate = totalRecords > 0 ? ((answeredCount / totalRecords) * 100).toFixed(1) : '0.0';
  const avgMos =
    totalRecords > 0
      ? Number((filtered.reduce((acc, r) => acc + r.mosScore, 0) / totalRecords).toFixed(2))
      : 0;

  const lines: string[] = [];

  // Optional Executive Summary Block (metadata comments)
  if (options.includeKpiSummary) {
    const timestampStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    lines.push(`# ==============================================================================`);
    lines.push(`# REPORT STORICO CHIAMATE CDR - ICPBX ASTERISK PBX`);
    lines.push(`# Data Generazione: ${timestampStr}`);
    lines.push(`# Periodo Selezionato: ${options.datePreset.toUpperCase()}`);
    lines.push(`# Filtro Direzione: ${options.directionFilter.toUpperCase()}`);
    lines.push(`# Totale Chiamate Analizzate: ${totalRecords}`);
    lines.push(`# Chiamate Risposte (ANSWERED): ${answeredCount} (${answerRate}%)`);
    lines.push(`# Chiamate Non Risposte (NO ANSWER): ${noAnswerCount}`);
    lines.push(`# Chiamate Occupate (BUSY): ${busyCount}`);
    lines.push(`# Chiamate Fallite (FAILED): ${failedCount}`);
    lines.push(`# Durata Totale Traffico: ${formatSecondsToMinutes(totalDurationSec)} (${totalDurationSec} sec)`);
    lines.push(`# Durata Totale Conversazione: ${formatSecondsToMinutes(totalBillableSec)} (${totalBillableSec} sec)`);
    lines.push(`# Punteggio MOS Medio Qualità: ${avgMos.toFixed(2)} / 5.00 (${getMosRatingLabel(avgMos)})`);
    lines.push(`# Costo Totale Stimato Traffico: € ${totalCost.toFixed(2)}`);
    lines.push(`# Delimitatore Colonne: "${delimiter}" (Compatibile Excel / LibreOffice / Google Sheets)`);
    lines.push(`# ==============================================================================`);
  }

  // Active columns
  const activeCols = ALL_CDR_COLUMNS.filter((col) => options.selectedColumns.includes(col.id));

  // Header line
  if (options.includeHeaders) {
    const headerRow = activeCols.map((c) => escapeCsvValue(c.label, delimiter)).join(delimiter);
    lines.push(headerRow);
  }

  // Data rows
  filtered.forEach((rec) => {
    const row = activeCols.map((col) => escapeCsvValue(col.getter(rec), delimiter)).join(delimiter);
    lines.push(row);
  });

  return {
    csvString: lines.join('\r\n'),
    totalRecords,
    totalBillableSec,
    totalDurationSec,
    totalCost,
    answeredCount,
    avgMos
  };
};

export const downloadCdrCsvFile = (csvContent: string, suggestedFilename?: string): void => {
  // Prefix with UTF-8 BOM so Excel opens Italian accents & timestamps seamlessly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const dateTag = new Date().toISOString().slice(0, 10);
  const timeTag = new Date().toTimeString().slice(0, 5).replace(':', '');
  const finalFilename = suggestedFilename || `report_cdr_chiamate_${dateTag}_${timeTag}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
