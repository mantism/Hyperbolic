import React, { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { getUserCombos } from "@/lib/services/userComboService";
import { UserCombo } from "@hyperbolic/shared-types";
import { useAuth } from "./AuthContext";

interface CombosContextType {
  userCombos: UserCombo[];
  loading: boolean;
  refreshing: boolean;
  refetchUserCombos: () => Promise<void>;
}

const CombosContext = createContext<CombosContextType | undefined>(undefined);

export function CombosProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userCombos, setUserCombos] = useState<UserCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserCombos = useCallback(async () => {
    if (!user) {
      setUserCombos([]);
      return;
    }

    try {
      const data = await getUserCombos(user.id);
      setUserCombos(data);
    } catch (error) {
      console.error("Error fetching user combos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const refetchUserCombos = useCallback(async () => {
    setRefreshing(true);
    await fetchUserCombos();
  }, [fetchUserCombos]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchUserCombos();
    }
  }, [user, fetchUserCombos]);

  // Realtime subscription for user combos
  useEffect(() => {
    if (!user) {
      return;
    }

    const combosChannel = supabase
      .channel(`user-combos-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "UserCombos",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch user combos when changes occur
          // TODO: optimize by handling inserts/updates/deletes directly
          fetchUserCombos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(combosChannel);
    };
  }, [user, fetchUserCombos]);

  const contextValue: CombosContextType = {
    userCombos,
    loading,
    refreshing,
    refetchUserCombos,
  };

  return (
    <CombosContext.Provider value={contextValue}>
      {children}
    </CombosContext.Provider>
  );
}

export function useCombos() {
  const context = React.useContext(CombosContext);
  if (context === undefined) {
    throw new Error("useCombos must be used within a CombosProvider");
  }
  return context;
}
