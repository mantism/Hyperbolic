import { useLocalSearchParams, useRouter } from "expo-router";
import { SessionDetailPage } from "@/components/sessions";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) {
    return null;
  }

  return <SessionDetailPage sessionId={id} onClose={() => router.back()} />;
}
