"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Search, Shield, UserCog, Users } from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import {
  USER_ROLE_OPTIONS,
  roleLabel,
} from "@/lib/auth/usersModel";
import {
  fetchAllUsers,
  promoteUserToAdmin,
  saveUserRole,
} from "@/lib/auth/usersService";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10";

const headClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";
const cellClass = "px-4 py-3 border-b border-border/60 text-sm";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function roleBadgeClass(role) {
  if (role === "admin") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (role === "analista") return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  return "border-border bg-secondary text-muted-foreground";
}

export function UsuariosRolesPage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  const [users, setUsers] = useState(/** @type {import("@/lib/auth/usersModel").UserProfile[]} */ ([]));
  const [draftRoles, setDraftRoles] = useState(/** @type {Record<string, string>} */ ({}));
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingUid, setSavingUid] = useState(/** @type {string | null} */ (null));
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [loading, isAdmin, router]);

  const loadUsers = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoadingUsers(true);
    setError(null);
    try {
      const list = await fetchAllUsers(user);
      setUsers(list);
      setDraftRoles(
        Object.fromEntries(list.map((u) => [u.uid, u.role]))
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cargar usuarios"
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleSaveRole = async (uid) => {
    if (!user) return;
    const newRole = draftRoles[uid];
    setSavingUid(uid);
    setMessage(null);
    setError(null);
    try {
      const updated = await saveUserRole(user, uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, ...updated, role: updated.role } : u))
      );
      setDraftRoles((prev) => ({ ...prev, [uid]: updated.role }));
      setMessage(`Rol actualizado para ${updated.email || uid}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingUid(null);
    }
  };

  const handlePromoteAdmin = async (uid) => {
    if (!user) return;
    setSavingUid(uid);
    setMessage(null);
    setError(null);
    try {
      const updated = await promoteUserToAdmin(user, uid);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, ...updated } : u))
      );
      setDraftRoles((prev) => ({ ...prev, [uid]: "admin" }));
      setMessage(`${updated.displayName || updated.email} promovido a Admin.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al promover");
    } finally {
      setSavingUid(null);
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando usuarios…
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="text-foreground space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-red-400" />
            <h1 className="text-2xl font-bold">Usuarios y Roles</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Administrá permisos del sistema. Los cambios se guardan en{" "}
            <code className="text-muted-foreground">users/&#123;uid&#125;</code> y
            sincronizan el token de Firebase.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <p className="text-muted-foreground text-xs">Total usuarios</p>
          <p className="text-xl font-semibold">{users.length}</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 space-y-2">
          <p className="font-medium">Error al cargar usuarios</p>
          <p>{error}</p>
          <p className="text-xs text-red-300/80 font-mono">
            Revise la consola del navegador (F12) para Status, StatusText y Response
            completos del endpoint GET /api/users.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o UID…"
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className={headClass}>Nombre</th>
                <th className={headClass}>Email</th>
                <th className={headClass}>UID</th>
                <th className={headClass}>Rol actual</th>
                <th className={headClass}>Fecha de alta</th>
                <th className={headClass}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const draft = draftRoles[u.uid] ?? u.role;
                const dirty = draft !== u.role;
                const busy = savingUid === u.uid;

                return (
                  <tr key={u.uid} className="hover:bg-muted/40">
                    <td className={cellClass}>
                      <div className="font-medium text-foreground">{u.displayName || "—"}</div>
                    </td>
                    <td className={cellClass}>{u.email || "—"}</td>
                    <td className={`${cellClass} font-mono text-xs text-muted-foreground max-w-[140px] truncate`}>
                      {u.uid}
                    </td>
                    <td className={cellClass}>
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${roleBadgeClass(u.role)}`}
                      >
                        <Shield className="h-3 w-3" />
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className={cellClass}>{formatDate(u.createdAt)}</td>
                    <td className={cellClass}>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
                          value={draft}
                          disabled={busy}
                          onChange={(e) =>
                            setDraftRoles((prev) => ({
                              ...prev,
                              [u.uid]: e.target.value,
                            }))
                          }
                        >
                          {USER_ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy || !dirty}
                          onClick={() => void handleSaveRole(u.uid)}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1" />
                          )}
                          Guardar
                        </Button>

                        {u.role !== "admin" && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={busy}
                            onClick={() => void handlePromoteAdmin(u.uid)}
                          >
                            <UserCog className="h-3.5 w-3.5 mr-1" />
                            Promover a Admin
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No hay usuarios que coincidan con la búsqueda.
          </p>
        )}
      </section>
    </div>
  );
}
