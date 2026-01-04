import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase/supabase";
import { getUserTricks } from "@/lib/services/userTrickService";
import { Trick, UserTrick } from "@hyperbolic/shared-types";
import { useAuth } from "./AuthContext";

export type TrickFilterOptions = {
  search?: string;
  category?: string;
  showLandedOnly?: boolean;
  difficultyRange?: [number, number];
  sortBy?: "name" | "difficulty" | "category";
  sortOrder?: "asc" | "desc";
};

interface TricksContextType {
  allTricks: Trick[];
  userTricks: UserTrick[];
  availableCategories: string[];
  loading: boolean;
  refreshing: boolean;
  refetchTricks: () => Promise<void>;
  refetchUserTricks: () => Promise<void>;
  getUserTrickForTrickId: (trickId: string) => UserTrick | undefined;
  filterAndSortTricks: (options: TrickFilterOptions) => Trick[];
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
      const data = await getUserTricks(user.id);
      setUserTricks(data);
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

  const filterAndSortTricks = useCallback(
    (options: TrickFilterOptions) => {
      let filtered = allTricks.filter((trick) => {
        // Search filter
        if (options.search) {
          const searchLower = options.search.toLowerCase();
          const matchesName = trick.name.toLowerCase().includes(searchLower);
          const matchesAlias = trick.aliases?.some((alias) =>
            alias.toLowerCase().includes(searchLower)
          );
          if (!matchesName && !matchesAlias) return false;
        }

        // Category filter
        if (options.category && options.category !== "") {
          if (!trick.categories?.includes(options.category)) return false;
        }

        // Difficulty range filter
        if (options.difficultyRange && trick.rating) {
          if (
            trick.rating < options.difficultyRange[0] ||
            trick.rating > options.difficultyRange[1]
          ) {
            return false;
          }
        }

        // Landed status filter
        if (options.showLandedOnly) {
          const userTrick = getUserTrickForTrickId(trick.id);
          const isLanded = userTrick?.landed === true;
          if (!isLanded) return false;
        }

        return true;
      });

      // Sort
      if (options.sortBy) {
        filtered.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (options.sortBy) {
            case "name":
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case "difficulty":
              aValue = a.rating || 0;
              bValue = b.rating || 0;
              break;
            case "category":
              aValue = a.categories?.[0] || "";
              bValue = b.categories?.[0] || "";
              break;
            default:
              return 0;
          }

          const order = options.sortOrder || "asc";
          if (aValue < bValue) return order === "asc" ? -1 : 1;
          if (aValue > bValue) return order === "asc" ? 1 : -1;
          return 0;
        });
      }

      return filtered;
    },
    [allTricks, getUserTrickForTrickId]
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
    filterAndSortTricks,
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
