import React, { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabase";
import {
  Session,
  getActiveSession,
  getUserSessions,
  startSession as startSessionService,
  endSession as endSessionService,
  updateSession as updateSessionService,
  deleteSession as deleteSessionService,
} from "@/lib/services/sessionService";
import { useAuth } from "./AuthContext";

interface SessionContextType {
  // Active session state
  activeSession: Session | null;
  hasActiveSession: boolean;

  // Session history
  sessions: Session[];
  loading: boolean;
  refreshing: boolean;

  // Actions
  startSession: (params?: {
    locationName?: string;
    notes?: string;
  }) => Promise<Session>;
  endSession: () => Promise<Session | null>;
  updateActiveSession: (params: {
    locationName?: string;
    notes?: string;
  }) => Promise<Session | null>;
  deleteSession: (sessionId: string) => Promise<void>;
  refetchSessions: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      return;
    }

    try {
      const session = await getActiveSession(user.id);
      setActiveSession(session);
    } catch (error) {
      console.error("Error fetching active session:", error);
    }
  }, [user]);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      const userSessions = await getUserSessions(user.id, {
        includeActive: false, // Don't include active session in history
      });
      setSessions(userSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const refetchSessions = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchActiveSession(), fetchSessions()]);
  }, [fetchActiveSession, fetchSessions]);

  const startSession = useCallback(
    async (params?: { locationName?: string; notes?: string }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Check if there's already an active session
      if (activeSession) {
        throw new Error("A session is already active. End it first.");
      }

      const newSession = await startSessionService({
        userId: user.id,
        locationName: params?.locationName,
        notes: params?.notes,
      });

      setActiveSession(newSession);
      return newSession;
    },
    [user, activeSession]
  );

  const endSession = useCallback(async () => {
    if (!activeSession) {
      return null;
    }

    const endedSession = await endSessionService(activeSession.id);
    setActiveSession(null);

    // Add to session history
    setSessions((prev) => [endedSession, ...prev]);

    return endedSession;
  }, [activeSession]);

  const updateActiveSession = useCallback(
    async (params: { locationName?: string; notes?: string }) => {
      if (!activeSession) {
        return null;
      }

      const updatedSession = await updateSessionService(activeSession.id, params);
      setActiveSession(updatedSession);
      return updatedSession;
    },
    [activeSession]
  );

  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteSessionService(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      Promise.all([fetchActiveSession(), fetchSessions()]);
    }
  }, [user, fetchActiveSession, fetchSessions]);

  // Realtime subscription for session updates
  useEffect(() => {
    if (!user) {
      return;
    }

    const sessionsChannel = supabase
      .channel(`user-sessions-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Sessions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch sessions when changes occur
          refetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
    };
  }, [user, refetchSessions]);

  const contextValue: SessionContextType = {
    activeSession,
    hasActiveSession: activeSession !== null,
    sessions,
    loading,
    refreshing,
    startSession,
    endSession,
    updateActiveSession,
    deleteSession,
    refetchSessions,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
