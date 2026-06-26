import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Shield, X } from 'lucide-react';
import { listUsers, createUser, updateUser, deleteUser, fetchAuditLog } from '../api/resources';
import type { AuditLogItem, Role, User } from '../types';
import { Spinner } from '../components/Feedback';
import { useAuth } from '../auth/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [tab, setTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<User[] | null>(null);
  const [audit, setAudit] = useState<AuditLogItem[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = () => listUsers().then(setUsers);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (tab === 'audit' && !audit) fetchAuditLog().then(setAudit);
  }, [tab]);

  const changeRole = async (u: User, role: Role) => {
    try {
      await updateUser(u.id, { role });
      loadUsers();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const toggleActive = async (u: User) => {
    await updateUser(u.id, { is_active: !u.is_active });
    loadUsers();
  };

  const remove = async (u: User) => {
    if (!confirm(`${t('common.delete')} ${u.username}?`)) return;
    try {
      await deleteUser(u.id);
      loadUsers();
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-400" /> {t('admin_page.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('admin_page.subtitle')}</p>
        </div>
        {tab === 'users' && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" /> {t('admin_page.new_user')}
          </button>
        )}
      </div>

      <div className="flex gap-5 border-b border-slate-800">
        <button onClick={() => setTab('users')} className={`pb-2.5 text-sm font-semibold border-b-2 ${tab === 'users' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent'}`}>
          {t('admin_page.users_tab')}
        </button>
        <button onClick={() => setTab('audit')} className={`pb-2.5 text-sm font-semibold border-b-2 ${tab === 'audit' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent'}`}>
          {t('admin_page.audit_tab')}
        </button>
      </div>

      {error && <p className="text-rose-400 text-xs">{error}</p>}

      {tab === 'users' && (
        !users ? <Spinner /> : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[10.5px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('admin_page.col_username')}</th>
                  <th className="px-4 py-3">{t('admin_page.col_role')}</th>
                  <th className="px-4 py-3">{t('admin_page.col_status')}</th>
                  <th className="px-4 py-3">{t('admin_page.col_last_login')}</th>
                  <th className="px-4 py-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-bold text-white">{u.username}{u.id === me?.id && <span className="text-slate-500 font-normal"> ({t('common.you')})</span>}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={u.id === me?.id}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white disabled:opacity-50"
                      >
                        <option value="admin">{t('role.admin')}</option>
                        <option value="inspector">{t('role.inspector')}</option>
                        <option value="viewer">{t('role.viewer')}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.is_active ? 'text-emerald-400' : 'text-slate-500'}>
                        {u.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => toggleActive(u)} disabled={u.id === me?.id} className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 font-semibold">
                        {u.is_active ? t('admin_page.deactivate') : t('admin_page.activate')}
                      </button>
                      <button onClick={() => remove(u)} disabled={u.id === me?.id} className="text-rose-400 hover:text-rose-300 disabled:opacity-40 font-semibold">
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'audit' && (
        !audit ? <Spinner /> : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[10.5px] uppercase font-bold text-slate-500 sticky top-0">
                <tr>
                  <th className="px-4 py-3">{t('admin_page.audit_when')}</th>
                  <th className="px-4 py-3">{t('admin_page.audit_actor')}</th>
                  <th className="px-4 py-3">{t('admin_page.audit_action')}</th>
                  <th className="px-4 py-3">{t('admin_page.audit_target')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-semibold text-white">{a.actor_username || '—'}</td>
                    <td className="px-4 py-2.5 text-indigo-400 font-mono">{a.action}</td>
                    <td className="px-4 py-2.5 text-slate-400">{a.target_type ? `${a.target_type} #${a.target_id}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadUsers(); }} />}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await createUser({ username, password, role });
      onCreated();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">{t('admin_page.new_user')}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="space-y-3">
          <input placeholder={t('login.username')} value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
          <input placeholder={t('login.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white">
            <option value="viewer">{t('role.viewer')}</option>
            <option value="inspector">{t('role.inspector')}</option>
            <option value="admin">{t('role.admin')}</option>
          </select>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button onClick={submit} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl">
            {saving ? t('common.saving') : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
