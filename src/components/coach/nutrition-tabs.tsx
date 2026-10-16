import type { Messages } from "@/i18n";
import { SectionTabs } from "./section-tabs";

export function NutritionTabs({ m, active }: { m: Messages; active: "diets" | "dishes" | "equivalents" }) {
  return (
    <SectionTabs
      active={active}
      tabs={[
        { key: "diets", href: "/coach/nutricion", label: m.nutrition.diets },
        { key: "dishes", href: "/coach/nutricion/platos", label: m.nutrition.dishes },
        { key: "equivalents", href: "/coach/nutricion/equivalencias", label: m.nutrition.equivalents },
      ]}
    />
  );
}
