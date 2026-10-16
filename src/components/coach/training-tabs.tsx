import type { Messages } from "@/i18n";
import { SectionTabs } from "./section-tabs";

export function TrainingTabs({ m, active }: { m: Messages; active: "programs" | "exercises" }) {
  return (
    <SectionTabs
      active={active}
      tabs={[
        { key: "programs", href: "/coach/entrenamientos", label: m.training.programs },
        { key: "exercises", href: "/coach/entrenamientos/ejercicios", label: m.training.exercises },
      ]}
    />
  );
}
