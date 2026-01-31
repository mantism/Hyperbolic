import { supabase } from "@/lib/supabase/supabase";

/**
 * Goal types supported by the system
 */
export type GoalType =
  | "trick_stomps"
  | "combo_stomps"
  | "trick_attempts"
  | "combo_attempts";

/**
 * Goal record from the database
 */
export interface Goal {
  id: string;
  user_id: string;
  created_at: string;
  goal_type: GoalType;
  target_id: string | null;
  target_name: string | null;
  target_value: number;
  current_value: number;
  completed_at: string | null;
}

/**
 * Parameters for creating a new goal
 */
interface CreateGoalParams {
  userId: string;
  goalType: GoalType;
  targetId?: string;
  targetName?: string;
  targetValue: number;
}

/**
 * Options for fetching user goals
 */
interface GetGoalsOptions {
  includeCompleted?: boolean;
}

/**
 * Create a new goal for a user
 */
export async function createGoal(params: CreateGoalParams): Promise<Goal> {
  const { userId, goalType, targetId, targetName, targetValue } = params;

  const { data, error } = await supabase
    .from("Goals")
    .insert({
      user_id: userId,
      goal_type: goalType,
      target_id: targetId || null,
      target_name: targetName || null,
      target_value: targetValue,
      current_value: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating goal:", error);
    throw error;
  }

  return data as Goal;
}

/**
 * Get all goals for a user
 */
export async function getUserGoals(
  userId: string,
  options: GetGoalsOptions = {}
): Promise<Goal[]> {
  const { includeCompleted = false } = options;

  let query = supabase
    .from("Goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeCompleted) {
    query = query.is("completed_at", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching goals:", error);
    throw error;
  }

  return (data as Goal[]) || [];
}

/**
 * Get a single goal by ID
 */
export async function getGoal(goalId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from("Goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching goal:", error);
    throw error;
  }

  return data as Goal;
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(
  goalId: string,
  newValue: number
): Promise<Goal> {
  // First get the goal to check target
  const goal = await getGoal(goalId);
  if (!goal) {
    throw new Error(`Goal ${goalId} not found`);
  }

  // Check if goal is now completed
  const isCompleted = newValue >= goal.target_value;

  const { data, error } = await supabase
    .from("Goals")
    .update({
      current_value: newValue,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", goalId)
    .select()
    .single();

  if (error) {
    console.error("Error updating goal progress:", error);
    throw error;
  }

  return data as Goal;
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from("Goals").delete().eq("id", goalId);

  if (error) {
    console.error("Error deleting goal:", error);
    throw error;
  }
}

/**
 * Check and update goals based on trick stats
 * Called after trick stats are updated
 */
export async function checkAndUpdateTrickGoals(
  userId: string,
  trickId: string,
  stats: { stomps: number; attempts: number }
): Promise<Goal[]> {
  // Get all incomplete goals for this trick
  const { data: goals, error } = await supabase
    .from("Goals")
    .select("*")
    .eq("user_id", userId)
    .eq("target_id", trickId)
    .in("goal_type", ["trick_stomps", "trick_attempts"])
    .is("completed_at", null);

  if (error) {
    console.error("Error fetching trick goals:", error);
    throw error;
  }

  if (!goals || goals.length === 0) {
    return [];
  }

  const updatedGoals: Goal[] = [];

  for (const goal of goals as Goal[]) {
    const newValue =
      goal.goal_type === "trick_stomps" ? stats.stomps : stats.attempts;

    if (newValue > goal.current_value) {
      const updated = await updateGoalProgress(goal.id, newValue);
      updatedGoals.push(updated);
    }
  }

  return updatedGoals;
}

/**
 * Check and update goals based on combo stats
 * Called after combo stats are updated
 */
export async function checkAndUpdateComboGoals(
  userId: string,
  comboId: string,
  stats: { stomps: number; attempts: number }
): Promise<Goal[]> {
  // Get all incomplete goals for this combo
  const { data: goals, error } = await supabase
    .from("Goals")
    .select("*")
    .eq("user_id", userId)
    .eq("target_id", comboId)
    .in("goal_type", ["combo_stomps", "combo_attempts"])
    .is("completed_at", null);

  if (error) {
    console.error("Error fetching combo goals:", error);
    throw error;
  }

  if (!goals || goals.length === 0) {
    return [];
  }

  const updatedGoals: Goal[] = [];

  for (const goal of goals as Goal[]) {
    const newValue =
      goal.goal_type === "combo_stomps" ? stats.stomps : stats.attempts;

    if (newValue > goal.current_value) {
      const updated = await updateGoalProgress(goal.id, newValue);
      updatedGoals.push(updated);
    }
  }

  return updatedGoals;
}

/**
 * Get goal type display label
 */
export function getGoalTypeLabel(goalType: GoalType): string {
  switch (goalType) {
    case "trick_stomps":
      return "Land trick";
    case "combo_stomps":
      return "Land combo";
    case "trick_attempts":
      return "Attempt trick";
    case "combo_attempts":
      return "Attempt combo";
    default:
      return goalType;
  }
}

/**
 * Get goal progress as a percentage (0-100)
 */
export function getGoalProgress(goal: Goal): number {
  if (goal.target_value === 0) return 100;
  return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
}

/**
 * Check if a goal is completed
 */
export function isGoalCompleted(goal: Goal): boolean {
  return goal.completed_at !== null;
}
