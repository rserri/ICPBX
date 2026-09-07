import React, { useState } from 'react';
import {
  Globe,
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  Star,
  Download,
  Trash2,
  Edit2
} from 'lucide-react';
import { Contact } from '../types/pbx';

interface ContactsManagerProps {
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onDialNumber: (num: string) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onDialNumber
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '',
    company: '',
    department: '',
    email: '',
    phone: '',
    mobile: '',
    extension: '',
    notes: '',
    isFavorite: false
  });

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.mobile.includes(searchTerm);

    const matchesFav = showOnlyFavorites ? c.isFavorite : true;
    return matchesSearch && matchesFav;
  });

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      company: '',
      department: '',
      email: '',
      phone: '',
      mobile: '',
      extension: '',
      notes: '',
      isFavorite: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({ ...contact });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || (!formData.phone && !formData.mobile)) {
      alert('Inserire almeno il nome e un recapito telefonico.');
      return;
    }

    if (editingContact) {
      onUpdateContact(formData as Contact);
    } else {
      onAddContact({
        ...formData,
        id: `cnt-${Date.now()}`
      } as Contact);
    }
    setIsModalOpen(false);
  };

  const exportVcard = () => {
    let vcf = '';
    filteredContacts.forEach((c) => {
      vcf += 'BEGIN:VCARD\r\n';
      vcf += 'VERSION:3.0\r\n';
      vcf += `FN:${c.name}\r\n`;
      vcf += `ORG:${c.company}\r\n`;
      vcf += `EMAIL:${c.email}\r\n`;
      if (c.phone) vcf += `TEL;TYPE=WORK,VOICE:${c.phone}\r\n`;
      if (c.mobile) vcf += `TEL;TYPE=CELL,VOICE:${c.mobile}\r\n`;
      vcf += 'END:VCARD\r\n';
    });

    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubrica_aziendale_${new Date().toISOString().slice(0, 10)}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <span>Rubrica Aziendale & Contatti Centralizzati</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Database contatti condiviso con sincronizzazione SIP/LDAP e funzione Click-to-Call diretta dal browser.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportVcard}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta vCard (.vcf)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Contatto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nome, azienda, telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-semibold transition ${
            showOnlyFavorites
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>Solo Preferiti</span>
        </button>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-slate-700 transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{contact.name}</h3>
                  <div className="text-xs text-sky-400 flex items-center space-x-1 mt-0.5">
                    <Building className="w-3 h-3" />
                    <span>{contact.company}</span>
                    {contact.department && <span className="text-slate-500"> • {contact.department}</span>}
                  </div>
                </div>

                <button
                  onClick={() => onUpdateContact({ ...contact, isFavorite: !contact.isFavorite })}
                  className="text-slate-500 hover:text-amber-400 p-1"
                >
                  <Star className={`w-4 h-4 ${contact.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>

              {/* Numbers */}
              <div className="mt-3 space-y-2 text-xs">
                {contact.phone && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{contact.phone}</span>
                    </div>
                    <button
                      onClick={() => onDialNumber(contact.phone)}
                      className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-semibold text-[11px] transition flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Chiama</span>
                    </button>
                  </div>
                )}

                {contact.mobile && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-mono">{contact.mobile}</span>
                    </div>
                    <button
                      onClick={() => onDialNumber(contact.mobile)}
                      className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-semibold text-[11px] transition flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Chiama</span>
                    </button>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-center space-x-2 text-slate-400 text-[11px] pt-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{contact.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
              <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                {contact.notes || 'Nessuna nota'}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEdit(contact)}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Rimuovere ${contact.name} dalla rubrica?`)) {
                      onDeleteContact(contact.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white">
                {editingContact ? 'Modifica Contatto' : 'Nuovo Contatto Rubrica'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome e Cognome *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  placeholder="es. Marco Rossi"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Azienda</label>
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Reparto / Ruolo</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Telefono Ufficio</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    placeholder="+39 02 ..."
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cellulare Mobile</label>
                  <input
                    type="text"
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    placeholder="+39 348 ..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
