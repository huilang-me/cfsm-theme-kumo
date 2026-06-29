import { Dashboard } from "@/components/dashboard";
import { TurnstileGate } from "@/components/turnstile-gate";

export default function Page() {
  return (
    <TurnstileGate>
      <Dashboard />
    </TurnstileGate>
  );
}
