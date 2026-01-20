import React, { useState, useEffect, useRef } from "react";
import { TouchableOpacity } from "react-native";
import ComboChip from "./ComboChip";

interface TappableTransitionChipProps {
  label: string;
  onDelete: () => void;
}

/**
 * Tappable transition chip with tap-to-reveal-X deletion pattern.
 * - Tap chip: reveals X button
 * - Tap X: deletes transition
 * - Auto-hides X after 3 seconds
 */
export default function TappableTransitionChip({
  label,
  onDelete,
}: TappableTransitionChipProps) {
  const [showDelete, setShowDelete] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide X button after 3 seconds
  useEffect(() => {
    if (showDelete) {
      timeoutRef.current = setTimeout(() => {
        setShowDelete(false);
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showDelete]);

  const handlePress = () => {
    setShowDelete(true);
  };

  const handleDelete = () => {
    setShowDelete(false);
    onDelete();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <ComboChip
        type="transition"
        label={label}
        onRemove={showDelete ? handleDelete : undefined}
      />
    </TouchableOpacity>
  );
}
