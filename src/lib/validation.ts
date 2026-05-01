import { z } from 'zod'

export const NormKeySchema = z.enum(['ras', 'esp', 'eu', 'epa'])
export type NormKey = z.infer<typeof NormKeySchema>

export const FormStateSchema = z.object({
  // Obligatorios
  normKey: NormKeySchema,
  users: z.number().int().min(1).max(10000),
  dotacion: z.number().min(10).max(500),
  temp: z.number().min(-10).max(50),
  depth: z.number().min(0.8).max(5),
  cleanYears: z.number().int().min(1).max(20),
  
  // Opcionales
  retCoef: z.number().min(0.5).max(1).optional().default(0.75),
  dboIn: z.number().min(50).max(500).optional().default(250),
  ssIn: z.number().min(50).max(500).optional().default(200),
  freeboard: z.number().min(0).max(1).optional().default(0.3),
  soilType: z.string().optional(),
  soilPermeability: z.enum(['high', 'medium', 'low', 'none', 'unknown']).optional(),
  calculated: z.boolean().optional().default(false),
})

export type FormState = z.infer<typeof FormStateSchema>

// Función de validación con mensajes amigables
export function validateFormState(data: unknown) {
  try {
    const parsed = FormStateSchema.parse(data)
    return { success: true, data: parsed }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      )
      return { success: false, errors: messages }
    }
    return { success: false, errors: ['Error desconocido'] }
  }
}

// Validar campo individual
export function validateField(field: keyof FormState, value: unknown) {
  const fieldSchema = FormStateSchema.pick({ [field]: true })
  const result = fieldSchema.safeParse({ [field]: value })
  return result.success ? null : result.error.errors[0]?.message
}
