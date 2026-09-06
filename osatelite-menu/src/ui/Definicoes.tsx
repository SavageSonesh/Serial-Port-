import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { TemplateSettings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { buildBackup, planMerge, validateBackup, type BackupValidation, type RestoreMode } from '../domain/backup';
import { formatDatePt, lisbonToday } from '../domain/dates';
import { useStore } from '../state/store';
import { downloadBlob } from '../render/download';
import { Modal } from './Modal';
import { useToast } from './Toast';

function TemplateSection() {
  const { settings, saveSettings } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<TemplateSettings>(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(settings), [settings]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSettings({ ...draft, title: draft.title.trim() || DEFAULT_SETTINGS.title, footerLines: draft.footerLines.map((l) => l.trim()).filter(Boolean) });
      toast('Definições do modelo guardadas.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={save}>
      <h2>Modelo impresso</h2>
      <p className="muted">
        Estas definições não aparecem no editor diário para evitar alterações acidentais. O formato A4, as margens, os tipos de letra e a
        posição do logótipo são fixos.
      </p>
      <label>
        Título
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <fieldset>
        <legend>Rodapé (texto fixo)</legend>
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            value={draft.footerLines[i] ?? ''}
            aria-label={`Linha ${i + 1} do rodapé`}
            onChange={(e) => {
              const lines = [...draft.footerLines];
              lines[i] = e.target.value;
              setDraft({ ...draft, footerLines: lines });
            }}
          />
        ))}
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={draft.uppercaseNames} onChange={(e) => setDraft({ ...draft, uppercaseNames: e.target.checked })} />
        Imprimir nomes dos pratos em maiúsculas (como na referência)
      </label>
      <label className="check">
        <input type="checkbox" checked={draft.logoGrayscale} onChange={(e) => setDraft({ ...draft, logoGrayscale: e.target.checked })} />
        Logótipo em tons de cinzento (para impressora a preto e branco)
      </label>
      <div className="logo-box">
        <div className="muted small">Logótipo (ficheiro fixo do projeto: public/brand/logo.png)</div>
        <img src={`${import.meta.env.BASE_URL}brand/logo.png`} alt="Logótipo O Satélite" style={draft.logoGrayscale ? { filter: 'grayscale(1)' } : undefined} />
      </div>
      <div className="row-end">
        <button type="button" className="btn" onClick={() => setDraft(DEFAULT_SETTINGS)}>
          Repor predefinições
        </button>
        <button type="submit" className="btn btn-primary" disabled={!dirty || busy}>
          {busy ? 'A guardar…' : 'Guardar definições'}
        </button>
      </div>
    </form>
  );
}

function BackupSection() {
  const { dishes, menus, settings, mergeBackup, replaceWithBackup } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [validation, setValidation] = useState<BackupValidation | null>(null);
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  function exportBackup() {
    const backup = buildBackup(dishes, menus, settings);
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `osatelite-backup-${lisbonToday()}.json`);
    toast('Cópia de segurança descarregada.');
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setValidation(validateBackup(text));
    setMode('merge');
    setConfirmText('');
  }

  const plan = validation?.ok ? planMerge(validation.backup, dishes, menus) : null;

  async function restore() {
    if (!validation?.ok) return;
    setBusy(true);
    try {
      if (mode === 'merge') {
        await mergeBackup(plan!.dishesToAdd, plan!.menusToAdd);
        toast(`Importados ${plan!.dishesToAdd.length} prato(s) e ${plan!.menusToAdd.length} menu(s). Nada foi substituído.`);
      } else {
        await replaceWithBackup(validation.backup);
        toast('Dados substituídos pelo conteúdo da cópia de segurança.');
      }
      setValidation(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Cópia de segurança</h2>
      <p className="muted">Exporta o catálogo, todos os menus e as definições num ficheiro JSON. A importação valida o ficheiro antes de tocar nos dados.</p>
      <div className="row-wrap">
        <button type="button" className="btn btn-primary" onClick={exportBackup} data-testid="btn-export-backup">
          Exportar cópia de segurança
        </button>
        <label className="btn file-btn">
          Importar cópia de segurança…
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} data-testid="input-import-backup" hidden />
        </label>
      </div>
      {validation && !validation.ok && (
        <div className="warn" role="alert" data-testid="backup-invalid">
          <strong>Ficheiro inválido — nada foi alterado.</strong>
          <ul>
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {validation?.ok && plan && (
        <Modal title="Restaurar cópia de segurança" onClose={() => setValidation(null)}>
          <p>
            Ficheiro de {new Date(validation.summary.exportedAt).toLocaleString('pt-PT')}: <strong>{validation.summary.dishes}</strong> pratos (
            {validation.summary.archivedDishes} arquivados), <strong>{validation.summary.menus}</strong> menus
            {validation.summary.firstMenuDate ? ` de ${formatDatePt(validation.summary.firstMenuDate)} a ${formatDatePt(validation.summary.lastMenuDate!)}` : ''}.
          </p>
          <label className="check">
            <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            <span>
              <strong>Juntar</strong> — adiciona só o que falta ({plan.dishesToAdd.length} pratos, {plan.menusToAdd.length} menus). Nada existente é alterado.
            </span>
          </label>
          <label className="check">
            <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <span>
              <strong>Substituir tudo</strong> — apaga os {dishes.length} pratos e {menus.length} menus atuais e usa apenas o ficheiro.
            </span>
          </label>
          {mode === 'replace' && (
            <label>
              Escreva SUBSTITUIR para confirmar
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} data-testid="confirm-replace" />
            </label>
          )}
          <div className="row-end">
            <button type="button" className="btn" onClick={() => setValidation(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={`btn ${mode === 'replace' ? 'btn-danger' : 'btn-primary'}`}
              disabled={busy || (mode === 'replace' && confirmText !== 'SUBSTITUIR')}
              onClick={restore}
              data-testid="btn-restore"
            >
              {busy ? 'A importar…' : mode === 'merge' ? 'Juntar' : 'Substituir tudo'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function AccountSection() {
  const { storage, user, signOut } = useStore();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  async function change(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast('A palavra-passe deve ter pelo menos 8 caracteres.', 'error');
    if (pw !== pw2) return toast('As palavras-passe não coincidem.', 'error');
    setBusy(true);
    try {
      await storage.changePassword(pw);
      toast('Palavra-passe alterada.');
      setPw('');
      setPw2('');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2>Conta e armazenamento</h2>
      <p>
        <strong>{storage.label}</strong>
        {user ? ` · sessão iniciada como ${user.email}` : ''}
      </p>
      {storage.kind === 'local' && (
        <p className="warn">
          Modo de demonstração: os dados ficam apenas neste navegador e não são partilhados com outros dispositivos. Configure a base de dados
          (ver README) para uso real.
        </p>
      )}
      {storage.kind === 'supabase' && (
        <form className="form" onSubmit={change}>
          <label>
            Nova palavra-passe
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </label>
          <label>
            Repetir palavra-passe
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </label>
          <div className="row-end">
            <button type="submit" className="btn" disabled={busy || !pw}>
              Alterar palavra-passe
            </button>
          </div>
        </form>
      )}
      {storage.requiresAuth && (
        <div className="row-end">
          <button type="button" className="btn btn-danger-outline" onClick={() => void signOut()}>
            Terminar sessão
          </button>
        </div>
      )}
    </section>
  );
}

export function Definicoes() {
  return (
    <div className="settings">
      <TemplateSection />
      <BackupSection />
      <AccountSection />
    </div>
  );
}
