import React, { useState, useEffect } from "react";
import { ComboLog, UserCombo } from "@hyperbolic/shared-types";
import { getComboLogsByComboId } from "@/lib/services/comboLogService";
import BaseLogs, { BaseLog } from "./BaseLogs";

interface ComboLogsProps {
  userCombo?: UserCombo | null;
  onAddPress?: () => void;
}

export default function ComboLogs({
  userCombo,
  onAddPress,
}: ComboLogsProps) {
  const [logs, setLogs] = useState<ComboLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [userCombo?.id]);

  const fetchLogs = async () => {
    if (!userCombo?.id) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getComboLogsByComboId(userCombo.id, 5);
      setLogs(data);
    } catch (error) {
      console.error("Error fetching combo logs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseLogs<ComboLog & BaseLog>
      logs={logs}
      loading={loading}
      showReps={false}
      emptySubtext='Tap "Add Log" to record a combo with notes and details'
      onAddPress={onAddPress}
    />
  );
}
