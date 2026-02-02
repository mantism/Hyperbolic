import React, { useState } from "react";
import { Trick } from "@hyperbolic/shared-types";
import AddLogModal from "./AddLogModal";
import QuickComboLogger from "./QuickComboLogger";
import { TrickSelectionModal, TrickLogModal } from "@/components/tricks";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";

interface QuickLogFlowProps {
  onClose: () => void;
}

type FlowStep =
  | "select-type"
  | "select-trick"
  | "log-trick"
  | "log-combo";

export default function QuickLogFlow({ onClose }: QuickLogFlowProps) {
  const { user } = useAuth();
  const { activeSession } = useSession();
  const [step, setStep] = useState<FlowStep>("select-type");
  const [selectedTrick, setSelectedTrick] = useState<Trick | null>(null);

  const handleClose = () => {
    setStep("select-type");
    setSelectedTrick(null);
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
          sessionId={activeSession?.id}
          onClose={handleClose}
          onLogAdded={handleLogAdded}
        />
      ) : null;
    case "log-combo":
      return user ? (
        <QuickComboLogger
          visible={true}
          userId={user.id}
          onClose={handleClose}
          onSuccess={handleLogAdded}
        />
      ) : null;
    default:
      return null;
  }
}
