import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { getSession } from "@/lib/data";
import { listDishes, listFoods } from "@/lib/data/nutrition";
import { PageHeader } from "@/components/ui/page-header";
import { NutritionTabs } from "@/components/coach/nutrition-tabs";
import { DishLibrary } from "./dish-library";

export const metadata = { title: "Platos · Siju" };

export default async function DishesPage() {
  const session = await getSession();
  if (session.role !== "owner") notFound();
  const [dishes, foods] = await Promise.all([listDishes(session), listFoods(session)]);
  const m = getMessages();
  return (
    <>
      <PageHeader title={m.nutrition.title} meta={`${dishes.length} ${m.nutrition.dishes.toLowerCase()}`} />
      <NutritionTabs m={m} active="dishes" />
      <DishLibrary dishes={dishes} foods={foods} m={m} />
    </>
  );
}
