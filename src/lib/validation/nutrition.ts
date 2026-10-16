import { z } from "zod";

const id = z.string().min(1).max(64);
const ration = z.number().min(0).max(20).multipleOf(0.25);

const rations = z.object({
  protein: ration.optional(),
  carbs: ration.optional(),
  fat: ration.optional(),
  dairy: ration.optional(),
  fruit: ration.optional(),
  veg: ration.optional(),
});

export const dietInput = z.object({
  id,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  days: z
    .array(
      z.object({
        id,
        name: z.string().trim().min(1).max(40),
        targets: z.object({
          protein: z.number().int().min(0).max(500),
          carbs: z.number().int().min(0).max(1000),
          fat: z.number().int().min(0).max(400),
        }),
        meals: z.array(z.object({ id, name: z.string().trim().min(1).max(40), rations })).min(1).max(8),
      }),
    )
    .min(1)
    .max(4),
});
export type DietInput = z.infer<typeof dietInput>;

export const dishInput = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  ingredients: z
    .array(z.object({ foodId: id, grams: z.number().min(1).max(2000) }))
    .min(1, "Añade al menos un ingrediente")
    .max(20),
  instructions: z.string().trim().max(2000),
});
export type DishInput = z.infer<typeof dishInput>;

export const assignDietInput = z.object({
  dietId: id,
  clientIds: z.array(id).min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
