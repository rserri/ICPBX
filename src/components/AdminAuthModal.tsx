import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  User,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  Sparkles
} from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pendingTabLabel?: string;
  isInline?: boolean; // When rendered inline in main viewport instead of popup modal
  onOpenChangePassword?: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pendingTabLabel,
  isInline = false,
  onOpenChangePassword
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen && !isInline) return null;

  const currentAdminPassword = localStorage.getItem('pbx_admin_password') || 'admin123';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const trimmedUser = username.trim().toLowerCase();
      
      // Verify username (Amministratore or admin)
      if (trimmedUser !== 'amministratore' && trimmedUser !== 'admin') {
        setErrorMessage('Nome utente o password non corretti. Riprova.');
        return;
      }

      if (password !== currentAdminPassword) {
        setErrorMessage('Nome utente o password non corretti. Riprova.');
        return;
      }

      // Success
      if (rememberMe) {
        localStorage.setItem('pbx_admin_authenticated', 'true');
      } else {
        sessionStorage.setItem('pbx_admin_authenticated', 'true');
      }

      onSuccess();
      setPassword('');
      setErrorMessage(null);
    }, 400);
  };

  const formContent = (
    <div className="space-y-5">
      {/* Header icon & text */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-lg">
          <Shield className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">
          Accesso Riservato Amministratore
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          L'accesso alla dashboard principale del centralino PBX è protetto da password.
          {pendingTabLabel && (
            <span className="block mt-1 font-medium text-sky-400">
              Modulo richiesto: {pendingTabLabel}
            </span>
          )}
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Username field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Nome Utente
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="admin-login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Inserisci nome utente..."
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-medium placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>
        </div>

        {/* Password field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="admin-login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la password..."
              required
              autoFocus={!isInline}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me option */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700 focus:ring-sky-500"
            />
            <span>Ricorda sessione su questo browser</span>
          </label>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="pt-2 space-y-2">
          <button
            id="btn-admin-submit-login"
            type="submit"
            disabled={isLoading || !password}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition ${
              password && !isLoading
                ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-sky-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Verifica credenziali in corso...</span>
              </span>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Accedi alla Dashboard Principale</span>
              </>
            )}
          </button>

          {!isInline && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
            >
              Annulla e Torna al Web Client Utente
            </button>
          )}
        </div>
      </form>

      {/* Security notice & Change Password link */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>Accesso di sicurezza protetto</span>
        </div>
        {onOpenChangePassword && (
          <button
            type="button"
            id="btn-admin-auth-change-password-link"
            onClick={onOpenChangePassword}
            className="text-sky-400 hover:text-sky-300 hover:underline font-semibold flex items-center gap-1 text-[11px]"
          >
            <Key className="w-3 h-3 text-amber-400" />
            <span>Cambia Password</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  // If rendered inline (full-screen placeholder when navigating directly to an admin tab)
  if (isInline) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        {formContent}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:underline font-medium"
          >
            ← Torna al Web Client Utenti
          </button>
          {onOpenChangePassword && (
            <button
              onClick={onOpenChangePassword}
              className="text-sky-400 hover:text-sky-300 hover:underline font-semibold flex items-center gap-1"
            >
              <Key className="w-3 h-3 text-amber-400" />
              <span>Cambia Password</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // If rendered as a Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {formContent}
      </div>
    </div>
  );
};

// Modal for Amministratore to change password
export const ChangeAdminPasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged: () => void;
}> = ({ isOpen, onClose, onPasswordChanged }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);

  if (!isOpen) return null;

  const actualPassword = localStorage.getItem('pbx_admin_password') || 'admin123';

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Inserisci password', color: 'bg-slate-700', text: 'text-slate-500' };
    let score = 0;
    if (pass.length >= 5) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Debole', color: 'bg-rose-500', text: 'text-rose-400' };
    if (score <= 2) return { score: 2, label: 'Media', color: 'bg-amber-500', text: 'text-amber-400' };
    if (score <= 3) return { score: 3, label: 'Buona', color: 'bg-sky-500', text: 'text-sky-400' };
    return { score: 4, label: 'Molto Forte', color: 'bg-emerald-500', text: 'text-emerald-400' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleResetToDefault = () => {
    localStorage.setItem('pbx_admin_password', 'admin123');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsResetConfirming(false);
    setSuccessMessage('Password ripristinata con successo ai valori predefiniti.');
    setTimeout(() => {
      onPasswordChanged();
      onClose();
    }, 1500);
  };

  const handleChange = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (currentPassword !== actualPassword) {
      setErrorMessage('La password attuale inserita non è corretta.');
      return;
    }

    if (newPassword.length < 5) {
      setErrorMessage('La nuova password deve contenere almeno 5 caratteri.');
      return;
    }

    if (newPassword === actualPassword) {
      setErrorMessage('La nuova password non può essere identica a quella attuale.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('La nuova password e la conferma non corrispondono.');
      return;
    }

    // Update password in localStorage
    localStorage.setItem('pbx_admin_password', newPassword);
    setSuccessMessage('Password dell\'Amministratore aggiornata con successo!');

    setTimeout(() => {
      onPasswordChanged();
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md">
            <Key className="w-6 h-6 text-sky-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Modifica Password Amministratore</h3>
          <p className="text-xs text-slate-400">
            Utente: <strong className="text-white">Amministratore</strong> • Centralino ICPBX
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleChange} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Password Attuale</label>
            <div className="relative">
              <input
                id="input-current-admin-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Inserisci password attuale..."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Nuova Password</label>
            <div className="relative">
              <input
                id="input-new-admin-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 5 caratteri..."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Strength meter bar */}
            {newPassword.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Complessità:</span>
                  <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1">
                  <div className={`rounded-full h-full ${strength.score >= 1 ? strength.color : 'bg-slate-800'}`} />
                  <div className={`rounded-full h-full ${strength.score >= 2 ? strength.color : 'bg-slate-800'}`} />
                  <div className={`rounded-full h-full ${strength.score >= 3 ? strength.color : 'bg-slate-800'}`} />
                  <div className={`rounded-full h-full ${strength.score >= 4 ? strength.color : 'bg-slate-800'}`} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Conferma Nuova Password</label>
            <div className="relative">
              <input
                id="input-confirm-admin-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la nuova password..."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              id="btn-save-admin-password"
              type="submit"
              className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
            >
              Salva Nuova Password
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Annulla
            </button>
          </div>
        </form>

        {/* Factory reset section */}
        <div className="pt-3 border-t border-slate-800/80">
          {!isResetConfirming ? (
            <button
              type="button"
              onClick={() => setIsResetConfirming(true)}
              className="w-full text-center text-[11px] text-slate-500 hover:text-amber-400 transition"
            >
              Password dimenticata? Ripristina impostazioni di fabbrica
            </button>
          ) : (
            <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-2 text-center">
              <p className="text-xs text-amber-200">
                Sei sicuro di voler reimpostare la password dell'Amministratore ai valori predefiniti di fabbrica?
              </p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
                >
                  Sì, Reimposta
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetConfirming(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
