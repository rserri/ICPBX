import React, { useState } from 'react';
import {
  Code,
  FileText,
  Copy,
  Check,
  Download,
  Server,
  FolderTree
} from 'lucide-react';
import { PHP_SOURCE_FILES, PhpSourceFile } from '../services/phpSourceCode';

export const PhpBackendViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PhpSourceFile>(PHP_SOURCE_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Code className="w-5 h-5 text-sky-400" />
            <span>Codice Sorgente Backend PHP & Configurazioni Asterisk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Backend RESTful in PHP 8.2, client AMI (Asterisk Manager Interface), script AGI per Notifiche Push e schema SQL.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiato!' : 'Copia File'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Scarica File</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: File Tree Explorer & Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center space-x-2">
            <FolderTree className="w-4 h-4 text-sky-400" />
            <span>Albero File Server (/var/www/pbx/)</span>
          </div>

          <div className="space-y-1">
            {PHP_SOURCE_FILES.map((file) => {
              const isSelected = selectedFile.filename === file.filename;
              return (
                <button
                  key={file.filename}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{file.filename}</span>
                  </div>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Viewer (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
          {/* Top file description bar */}
          <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs font-bold text-white">{selectedFile.filename}</div>
              <div className="text-[11px] text-slate-400">{selectedFile.description}</div>
            </div>
            <span className="font-mono text-xs text-sky-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              {selectedFile.category.toUpperCase()}
            </span>
          </div>

          {/* Syntax Highlighted Box */}
          <div className="bg-slate-950 p-4 flex-1 overflow-x-auto max-h-[550px]">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed">
              {selectedFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
