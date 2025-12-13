import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase/supabase";
import { Trick, UserTrick } from "@hyperbolic/shared-types";
import { useAuth } from "./AuthContext";

interface TricksContextType {
  allTricks: Trick[];
  userTricks: UserTrick[];
  availableCategories: string[];
  loading: boolean;
  refreshing: boolean;
  refetchTricks: () => Promise<void>;
  refetchUserTricks: () => Promise<void>;
  getUserTrickForTrickId: (trickId: string) => UserTrick | undefined;
}

const TricksContext = createContext<TricksContextType | undefined>(undefined);

export function TricksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [allTricks, setAllTricks] = useState<Trick[]>([]);
  const [userTricks, setUserTricks] = useState<UserTrick[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllTricks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("Tricks")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      const tricks = data as Trick[];
      setAllTricks(tricks);

      // Extract unique categories
      const categories = new Set<string>();
      tricks.forEach((trick) => {
        trick.categories?.forEach((category: string) =>
          categories.add(category)
        );
      });
      setAvailableCategories(Array.from(categories).sort());
    } catch (error) {
      console.error("Error fetching tricks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchUserTricks = useCallback(async () => {
    if (!user) {
      setUserTricks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("UserToTricks")
        .select(
          `
          *,
          trick:Tricks(*)
        `
        )
        .eq("userID", user.id);

      if (error) throw error;
      setUserTricks(data as UserTrick[]);
    } catch (error) {
      console.error("Error fetching user tricks:", error);
    }
  }, [user]);

  const refetchTricks = useCallback(async () => {
    setRefreshing(true);
    await fetchAllTricks();
  }, [fetchAllTricks]);

  const refetchUserTricks = useCallback(async () => {
    await fetchUserTricks();
  }, [fetchUserTricks]);

  const getUserTrickForTrickId = useCallback(
    (trickId: string) => {
      return userTricks.find((ut) => ut.trickID === trickId);
    },
    [userTricks]
  );

  // Initial fetch
  useEffect(() => {
    fetchAllTricks();
  }, [fetchAllTricks]);

  useEffect(() => {
    if (user) {
      fetchUserTricks();
    }
  }, [user, fetchUserTricks]);

  // Set up realtime subscription for user tricks
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-tricks-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "UserToTricks",
          filter: `userID=eq.${user.id}`,
        },
        () => {
          // Refetch user tricks when changes occur
          fetchUserTricks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserTricks]);

  const value: TricksContextType = {
    allTricks,
    userTricks,
    availableCategories,
    loading,
    refreshing,
    refetchTricks,
    refetchUserTricks,
    getUserTrickForTrickId,
  };

  return (
    <TricksContext.Provider value={value}>{children}</TricksContext.Provider>
  );
}

export function useTricks() {
  const context = useContext(TricksContext);
  if (context === undefined) {
    throw new Error("useTricks must be used within a TricksProvider");
  }
  return context;
}
