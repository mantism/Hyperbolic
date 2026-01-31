import React, { createContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/supabase";
import {
  Goal,
  GoalType,
  getUserGoals,
  createGoal as createGoalService,
  deleteGoal as deleteGoalService,
} from "@/lib/services/goalService";
import { useAuth } from "./AuthContext";

interface GoalsContextType {
  goals: Goal[];
  completedGoals: Goal[];
  loading: boolean;
  refreshing: boolean;
  refetchGoals: () => Promise<void>;
  createGoal: (params: {
    goalType: GoalType;
    targetId?: string;
    targetName?: string;
    targetValue: number;
  }) => Promise<Goal>;
  deleteGoal: (goalId: string) => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setCompletedGoals([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch incomplete goals
      const incompleteGoals = await getUserGoals(user.id, {
        includeCompleted: false,
      });
      setGoals(incompleteGoals);

      // Fetch completed goals
      const allGoals = await getUserGoals(user.id, { includeCompleted: true });
      const completed = allGoals.filter((g) => g.completed_at !== null);
      setCompletedGoals(completed);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const refetchGoals = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
  }, [fetchGoals]);

  const createGoal = useCallback(
    async (params: {
      goalType: GoalType;
      targetId?: string;
      targetName?: string;
      targetValue: number;
    }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const newGoal = await createGoalService({
        userId: user.id,
        ...params,
      });

      // Add to local state
      setGoals((prev) => [newGoal, ...prev]);

      return newGoal;
    },
    [user]
  );

  const deleteGoal = useCallback(async (goalId: string) => {
    await deleteGoalService(goalId);

    // Remove from local state
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setCompletedGoals((prev) => prev.filter((g) => g.id !== goalId));
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user, fetchGoals]);

  // Realtime subscription for goal updates
  useEffect(() => {
    if (!user) {
      return;
    }

    const goalsChannel = supabase
      .channel(`user-goals-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Goals",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch goals when changes occur
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
    };
  }, [user, fetchGoals]);

  const contextValue: GoalsContextType = {
    goals,
    completedGoals,
    loading,
    refreshing,
    refetchGoals,
    createGoal,
    deleteGoal,
  };

  return (
    <GoalsContext.Provider value={contextValue}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = React.useContext(GoalsContext);
  if (context === undefined) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return context;
}
