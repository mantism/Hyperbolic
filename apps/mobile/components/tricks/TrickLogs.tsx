import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { Database, UserTrick } from "@hyperbolic/shared-types";
import { BaseLogs, BaseLog } from "@/components/ui";

type TrickLog = Database["public"]["Tables"]["TrickLogs"]["Row"];

interface TrickLogsProps {
  userTrick?: UserTrick | null;
  onAddPress?: () => void;
}

export default function TrickLogs({ userTrick, onAddPress }: TrickLogsProps) {
  const [logs, setLogs] = useState<TrickLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [userTrick?.id]);

  const fetchLogs = async () => {
    if (!userTrick?.id) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("TrickLogs")
        .select("*")
        .eq("user_trick_id", userTrick.id)
        .order("logged_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseLogs<TrickLog & BaseLog>
      logs={logs}
      loading={loading}
      showReps={true}
      emptySubtext='Tap "Add Log" to record a trick with notes and details'
      onAddPress={onAddPress}
    />
  );
}
