import React, { useState } from "react";
import { Trick } from "@hyperbolic/shared-types";
import AddLogModal from "./AddLogModal";
import TrickSelectionModal from "./TrickSelectionModal";
import TrickLogs from "./TrickLogs";
import { useAuth } from "@/contexts/AuthContext";

interface QuickLogFlowProps {
  visible: boolean;
  onClose: () => void;
}

export default function QuickLogFlow({ visible, onClose }: QuickLogFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<
    "select-type" | "select-trick" | "log-trick"
  >("select-type");
  const [selectedTrick, setSelectedTrick] = useState<Trick | null>(null);
  const [userTrickId, setUserTrickId] = useState<string | null>(null);

  const handleClose = () => {
    setStep("select-type");
    setSelectedTrick(null);
    setUserTrickId(null);
    onClose();
  };

  const handleSelectTrick = () => {
    setStep("select-trick");
  };

  const handleTrickSelected = (trick: Trick) => {
    setSelectedTrick(trick);
    // Add a small delay to ensure TrickSelectionModal closes before TrickLogs opens
    setTimeout(() => {
      setStep("log-trick");
    }, 100);
  };

  const handleLogAdded = () => {
    handleClose();
  };

  // Only render TrickLogs when we have a selected trick and are on the log-trick step
  const shouldShowTrickLog =
    (selectedTrick && user && step === "log-trick") || undefined;

  return (
    <>
      {/* Step 1: Select what to log (Trick/Combo/Session) */}
      <AddLogModal
        visible={visible && step === "select-type"}
        onClose={handleClose}
        onSelectTrick={handleSelectTrick}
      />

      {/* Step 2: Select which trick */}
      <TrickSelectionModal
        visible={visible && step === "select-trick"}
        onClose={handleClose}
        onSelectTrick={handleTrickSelected}
      />

      {/* Step 3: Log the trick details */}
      {selectedTrick && user && (
        <TrickLogs
          userTrick={null}
          trickId={selectedTrick.id}
          userId={user.id}
          onLogAdded={handleLogAdded}
          trickName={selectedTrick.name}
          showAddModal={shouldShowTrickLog}
          onCloseModal={handleClose}
        />
      )}
    </>
  );
}
