import React, { useState } from "react";
import { Trick } from "@hyperbolic/shared-types";
import AddLogModal from "./AddLogModal";
import TrickSelectionModal from "./TrickSelectionModal";
import TrickLogModal from "./TrickLogModal";
import { useAuth } from "@/contexts/AuthContext";

interface QuickLogFlowProps {
  onClose: () => void;
}

export default function QuickLogFlow({ onClose }: QuickLogFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<
    "select-type" | "select-trick" | "log-trick" | "log-combo"
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

  const handleSelectCombo = () => {
    setStep("log-combo");
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

  switch (step) {
    case "select-type":
      return (
        <AddLogModal
          visible={true}
          onClose={handleClose}
          onSelectTrick={handleSelectTrick}
          onSelectCombo={handleSelectCombo}
        />
      );
    case "select-trick":
      return (
        <TrickSelectionModal
          visible={true}
          onClose={handleClose}
          onSelectTrick={handleTrickSelected}
        />
      );
    case "log-trick":
      return selectedTrick && user ? (
        <TrickLogModal
          visible={true}
          userTrick={null}
          trickId={selectedTrick.id}
          userId={user.id}
          trickName={selectedTrick.name}
          onClose={handleClose}
          onLogAdded={handleLogAdded}
        />
      ) : null;
    default:
      return null;
  }
}
