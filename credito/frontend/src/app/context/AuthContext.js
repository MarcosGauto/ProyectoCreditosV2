"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/service/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  isAdminRole,
  isAnalistaRole,
  isUsuarioRole,
} from "@/lib/auth/permissions";
import { normalizeUserRole } from "@/lib/auth/usersModel";
import {
  ensureUserProfile,
  fetchUserProfileFromApi,
} from "@/lib/auth/usersService";

/** @typedef {import("@/lib/auth/usersModel").UserProfile} UserProfile */

const AuthContext = createContext();

/**
 * @param {import("firebase/auth").User} firebaseUser
 */
async function loadUserSession(firebaseUser) {
  let profile = null;

  try {
    profile = await fetchUserProfileFromApi(firebaseUser);
  } catch (err) {
    console.warn("fetchUserProfileFromApi:", err);
  }

  if (!profile) {
    try {
      profile = await ensureUserProfile(firebaseUser);
    } catch (err) {
      console.warn("ensureUserProfile:", err);
    }
  }

  try {
    await firebaseUser.getIdToken(true);
  } catch {
    /* ignore */
  }

  const role = normalizeUserRole(profile?.role);

  return {
    profile: profile ?? {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      displayName:
        firebaseUser.displayName ||
        firebaseUser.email?.split("@")[0] ||
        "Usuario",
      role,
      createdAt: null,
    },
    role,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(/** @type {UserProfile | null} */ (null));
  const [role, setRole] = useState(/** @type {string | null} */ (null));
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const session = await loadUserSession(firebaseUser);
      setProfile(session.profile);
      setRole(session.role);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);

      if (!firebaseUser) {
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const session = await loadUserSession(firebaseUser);
        setProfile(session.profile);
        setRole(session.role);
      } catch (err) {
        console.error("Error resolviendo sesión:", err);
        const fallbackRole = "usuario";
        setProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName:
            firebaseUser.displayName ||
            firebaseUser.email?.split("@")[0] ||
            "Usuario",
          role: fallbackRole,
          createdAt: null,
        });
        setRole(fallbackRole);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = useMemo(() => isAdminRole(role), [role]);
  const isAnalista = useMemo(() => isAnalistaRole(role), [role]);
  const isUsuario = useMemo(() => isUsuarioRole(role), [role]);

  const displayName = profile?.displayName || user?.displayName || user?.email || "";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        displayName,
        loading,
        isAdmin,
        isAnalista,
        isUsuario,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
