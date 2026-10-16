import type { Diet, DietDay, Dish, Food, FoodGroup, Rations } from "@/lib/types";
import { ORG_ID } from "./seed";

/**
 * Alimentos base con valores orientativos por 100 g (crudo salvo indicación).
 * Fuente de referencia: tablas de composición habituales (BEDCA/USDA), redondeadas.
 */
const F: [string, FoodGroup, number, number, number, number, number?, string?][] = [
  // nombre, grupo, kcal, proteína, hidratos, grasa, gramos por unidad, nombre de la unidad
  ["Pechuga de pollo", "protein", 110, 23, 0, 1.5],
  ["Pechuga de pavo", "protein", 105, 24, 0, 1],
  ["Ternera magra", "protein", 120, 21, 0, 4],
  ["Lomo de cerdo", "protein", 140, 21, 0, 6],
  ["Merluza", "protein", 75, 16, 0, 1],
  ["Salmón", "protein", 200, 20, 0, 13],
  ["Atún al natural (lata)", "protein", 100, 23, 0, 1],
  ["Huevo", "protein", 143, 12.6, 0.7, 9.5, 60, "huevo"],
  ["Claras de huevo", "protein", 52, 11, 0.7, 0.2],
  ["Tofu firme", "protein", 145, 15, 2, 8],
  ["Arroz", "carbs", 360, 7, 78, 0.6],
  ["Pasta", "carbs", 355, 12, 72, 1.5],
  ["Pan integral", "carbs", 250, 10, 42, 3.5],
  ["Copos de avena", "carbs", 380, 13, 60, 7],
  ["Patata", "carbs", 77, 2, 17, 0.1],
  ["Boniato", "carbs", 86, 1.6, 20, 0.1],
  ["Quinoa", "carbs", 368, 14, 64, 6],
  ["Tortitas de arroz", "carbs", 387, 8, 81, 3, 8, "tortita"],
  ["Lentejas cocidas", "carbs", 116, 9, 20, 0.4],
  ["Garbanzos cocidos", "carbs", 140, 8, 20, 2.5],
  ["Aceite de oliva", "fat", 884, 0, 0, 100],
  ["Aguacate", "fat", 160, 2, 9, 15],
  ["Nueces", "fat", 654, 15, 14, 65],
  ["Almendras", "fat", 579, 21, 22, 50],
  ["Crema de cacahuete", "fat", 588, 25, 20, 50],
  ["Aceitunas", "fat", 145, 1, 4, 15],
  ["Leche semidesnatada", "dairy", 46, 3.3, 4.8, 1.6],
  ["Yogur natural", "dairy", 61, 3.5, 4.7, 3.3, 125, "yogur"],
  ["Yogur griego natural 0 %", "dairy", 59, 10, 3.6, 0.4],
  ["Queso fresco batido 0 %", "dairy", 46, 8, 3.5, 0.2],
  ["Kéfir", "dairy", 52, 3.3, 4, 2],
  ["Manzana", "fruit", 52, 0.3, 14, 0.2, 180, "pieza"],
  ["Plátano", "fruit", 89, 1.1, 23, 0.3, 120, "pieza"],
  ["Naranja", "fruit", 47, 0.9, 12, 0.1, 200, "pieza"],
  ["Fresas", "fruit", 32, 0.7, 7.7, 0.3],
  ["Kiwi", "fruit", 61, 1.1, 15, 0.5, 75, "pieza"],
  ["Arándanos", "fruit", 57, 0.7, 14, 0.3],
  ["Piña", "fruit", 50, 0.5, 13, 0.1],
  ["Brócoli", "veg", 34, 2.8, 7, 0.4],
  ["Calabacín", "veg", 17, 1.2, 3.1, 0.3],
  ["Espinacas", "veg", 23, 2.9, 3.6, 0.4],
  ["Tomate", "veg", 18, 0.9, 3.9, 0.2],
  ["Lechuga", "veg", 15, 1.4, 2.9, 0.2],
  ["Pimiento", "veg", 31, 1, 6, 0.3],
  ["Judías verdes", "veg", 31, 1.8, 7, 0.2],
];

export function buildFoods(): Food[] {
  return F.map(([name, group, kcal, protein, carbs, fat, unitGrams, unitName], i) => ({
    id: `fd_${String(i + 1).padStart(3, "0")}`,
    orgId: null,
    name,
    group,
    per100: { kcal, protein, carbs, fat },
    unitGrams: unitGrams ?? null,
    unitName: unitName ?? null,
  }));
}

const food = (name: string) => {
  const i = F.findIndex(([n]) => n === name);
  if (i < 0) throw new Error(`Alimento de ejemplo no encontrado: ${name}`);
  return `fd_${String(i + 1).padStart(3, "0")}`;
};

let n = 0;
const uid = (p: string) => `${p}_seed_${++n}`;
const meal = (name: string, rations: Rations) => ({ id: uid("ml"), name, rations });

const breakfast: Rations = { protein: 1, dairy: 1, carbs: 2, fruit: 1 };
const snack: Rations = { dairy: 2, fruit: 1, fat: 0.5 };

function defDays(): DietDay[] {
  return [
    {
      id: uid("dd"),
      name: "Entreno",
      targets: { protein: 150, carbs: 190, fat: 60 },
      meals: [
        meal("Desayuno", breakfast),
        meal("Comida", { protein: 4, carbs: 3, fat: 1, veg: 2 }),
        meal("Merienda", snack),
        meal("Cena", { protein: 4, carbs: 1, fat: 1, veg: 2 }),
      ],
    },
    {
      id: uid("dd"),
      name: "Descanso",
      targets: { protein: 150, carbs: 130, fat: 65 },
      meals: [
        meal("Desayuno", breakfast),
        meal("Comida", { protein: 4, carbs: 2, fat: 1, veg: 2 }),
        meal("Merienda", snack),
        meal("Cena", { protein: 4, fat: 1.5, veg: 2 }),
      ],
    },
  ];
}

export function buildDiets(now: Date): Diet[] {
  return [
    {
      id: "diet_001",
      orgId: ORG_ID,
      name: "Definición ~1.900 kcal",
      description: "Días de entreno con más hidratos. Verdura libre.",
      days: defDays(),
      updatedAt: new Date(now.getTime() - 5 * 86_400_000).toISOString(),
      archivedAt: null,
    },
    {
      id: "diet_002",
      orgId: ORG_ID,
      name: "Volumen ~2.800 kcal",
      description: "",
      days: [
        {
          id: uid("dd"),
          name: "Todos los días",
          targets: { protein: 160, carbs: 350, fat: 80 },
          meals: [
            meal("Desayuno", { protein: 1, dairy: 1, carbs: 4, fruit: 1, fat: 1 }),
            meal("Comida", { protein: 4, carbs: 5, fat: 2, veg: 2 }),
            meal("Merienda", { dairy: 2, carbs: 2, fruit: 1, fat: 1 }),
            meal("Cena", { protein: 4, carbs: 4, fat: 2, veg: 2 }),
          ],
        },
      ],
      updatedAt: new Date(now.getTime() - 20 * 86_400_000).toISOString(),
      archivedAt: null,
    },
  ];
}

export function buildDishes(): Dish[] {
  const d = (id: string, name: string, ing: [string, number][], instructions: string): Dish => ({
    id,
    orgId: ORG_ID,
    name,
    ingredients: ing.map(([f, grams]) => ({ foodId: food(f), grams })),
    instructions,
    archivedAt: null,
  });
  return [
    d("dish_001", "Pollo con arroz y brócoli", [["Pechuga de pollo", 175], ["Arroz", 75], ["Aceite de oliva", 10], ["Brócoli", 200]],
      "Cuece el arroz. Saltea el pollo en dados con el aceite y añade el brócoli al vapor."),
    d("dish_002", "Merluza con patata y judías verdes", [["Merluza", 250], ["Patata", 350], ["Aceite de oliva", 10], ["Judías verdes", 150]],
      "Patata y judías cocidas. Merluza a la plancha con el aceite."),
    d("dish_003", "Tortilla de claras con pan y tomate", [["Claras de huevo", 300], ["Huevo", 60], ["Pan integral", 50], ["Aceite de oliva", 10], ["Tomate", 250]],
      "Tortilla francesa con las claras y el huevo. Pan tostado con tomate rallado."),
    d("dish_004", "Salmón con quinoa y verduras", [["Salmón", 200], ["Quinoa", 30], ["Aceite de oliva", 5], ["Calabacín", 200], ["Pimiento", 100]],
      "Salmón al horno 12 min a 200 °C. Quinoa cocida y verduras salteadas."),
    d("dish_005", "Porridge de avena con plátano", [["Copos de avena", 65], ["Leche semidesnatada", 200], ["Plátano", 70], ["Claras de huevo", 90]],
      "Cuece la avena con la leche, añade las claras al final removiendo y el plátano en rodajas."),
    d("dish_006", "Yogur griego con fresas y nueces", [["Yogur griego natural 0 %", 140], ["Fresas", 200], ["Nueces", 8]],
      "Mezcla y listo."),
    d("dish_007", "Lentejas estofadas con ternera", [["Lentejas cocidas", 300], ["Ternera magra", 100], ["Aceite de oliva", 10], ["Pimiento", 80], ["Tomate", 80]],
      "Sofrito de pimiento y tomate, añade la ternera en dados y las lentejas cocidas. 15 min a fuego lento."),
  ];
}
