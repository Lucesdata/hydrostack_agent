import { 
  validateFormState, 
  validateField, 
  FormStateSchema,
  NormKeySchema,
} from '@/lib/validation'

describe('NormKeySchema', () => {
  it('should accept valid norm keys', () => {
    expect(NormKeySchema.safeParse('ras').success).toBe(true)
    expect(NormKeySchema.safeParse('esp').success).toBe(true)
    expect(NormKeySchema.safeParse('eu').success).toBe(true)
    expect(NormKeySchema.safeParse('epa').success).toBe(true)
  })

  it('should reject invalid norm keys', () => {
    expect(NormKeySchema.safeParse('invalid').success).toBe(false)
    expect(NormKeySchema.safeParse('ras2').success).toBe(false)
    expect(NormKeySchema.safeParse('').success).toBe(false)
    expect(NormKeySchema.safeParse(123).success).toBe(false)
  })
})

describe('FormStateSchema validation', () => {
  const validState = {
    normKey: 'ras' as const,
    users: 5,
    dotacion: 120,
    temp: 20,
    depth: 1.5,
    cleanYears: 3,
  }

  it('should accept valid form state', () => {
    const result = FormStateSchema.safeParse(validState)
    expect(result.success).toBe(true)
  })

  it('should validate users range (1-10000)', () => {
    expect(FormStateSchema.safeParse({ ...validState, users: 0 }).success).toBe(false)
    expect(FormStateSchema.safeParse({ ...validState, users: 1 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, users: 10000 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, users: 10001 }).success).toBe(false)
  })

  it('should validate dotacion range (10-500)', () => {
    expect(FormStateSchema.safeParse({ ...validState, dotacion: 5 }).success).toBe(false)
    expect(FormStateSchema.safeParse({ ...validState, dotacion: 10 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, dotacion: 500 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, dotacion: 600 }).success).toBe(false)
  })

  it('should validate temperature range (-10 to 50)', () => {
    expect(FormStateSchema.safeParse({ ...validState, temp: -11 }).success).toBe(false)
    expect(FormStateSchema.safeParse({ ...validState, temp: -10 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, temp: 50 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, temp: 51 }).success).toBe(false)
  })

  it('should validate depth range (0.8-5)', () => {
    expect(FormStateSchema.safeParse({ ...validState, depth: 0.7 }).success).toBe(false)
    expect(FormStateSchema.safeParse({ ...validState, depth: 0.8 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, depth: 5 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, depth: 5.1 }).success).toBe(false)
  })

  it('should validate cleanYears range (1-20)', () => {
    expect(FormStateSchema.safeParse({ ...validState, cleanYears: 0 }).success).toBe(false)
    expect(FormStateSchema.safeParse({ ...validState, cleanYears: 1 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, cleanYears: 20 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, cleanYears: 21 }).success).toBe(false)
  })

  it('should validate retCoef range (0.5-1)', () => {
    expect(FormStateSchema.safeParse({ ...validState, retCoef: 0.4 }).success).toBe(false)
    expect(FormStateSchema.safeParse({ ...validState, retCoef: 0.5 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, retCoef: 1 }).success).toBe(true)
    expect(FormStateSchema.safeParse({ ...validState, retCoef: 1.1 }).success).toBe(false)
  })

  it('should apply default retCoef (0.75)', () => {
    const result = FormStateSchema.safeParse(validState)
    if (result.success) {
      expect(result.data.retCoef).toBe(0.75)
    }
  })

  it('should apply default dboIn (250)', () => {
    const result = FormStateSchema.safeParse(validState)
    if (result.success) {
      expect(result.data.dboIn).toBe(250)
    }
  })

  it('should apply default ssIn (200)', () => {
    const result = FormStateSchema.safeParse(validState)
    if (result.success) {
      expect(result.data.ssIn).toBe(200)
    }
  })

  it('should apply default freeboard (0.3)', () => {
    const result = FormStateSchema.safeParse(validState)
    if (result.success) {
      expect(result.data.freeboard).toBe(0.3)
    }
  })

  it('should validate soilPermeability enum', () => {
    expect(FormStateSchema.safeParse({ 
      ...validState, 
      soilPermeability: 'high' 
    }).success).toBe(true)
    
    expect(FormStateSchema.safeParse({ 
      ...validState, 
      soilPermeability: 'invalid' 
    }).success).toBe(false)
  })

  it('should allow optional fields to be omitted', () => {
    const minimal = {
      normKey: 'ras' as const,
      users: 5,
      dotacion: 120,
      temp: 20,
      depth: 1.5,
      cleanYears: 3,
    }
    
    const result = FormStateSchema.safeParse(minimal)
    expect(result.success).toBe(true)
  })

  it('should allow empty object (all fields optional)', () => {
    const result = FormStateSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('validateFormState function', () => {
  const validState = {
    normKey: 'ras',
    users: 5,
    dotacion: 120,
    temp: 20,
    depth: 1.5,
    cleanYears: 3,
  }

  it('should return success: true for valid data', () => {
    const result = validateFormState(validState)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeDefined()
    }
  })

  it('should return success: true for empty object', () => {
    const result = validateFormState({})
    expect(result.success).toBe(true)
  })

  it('should return success: false for invalid norm key', () => {
    const invalid = { normKey: 'invalid' }
    const result = validateFormState(invalid)
    expect(result.success).toBe(false)
  })

  it('should return success: false for out-of-range users', () => {
    const invalid = { users: -5 }
    const result = validateFormState(invalid)
    expect(result.success).toBe(false)
  })

  it('should provide error messages array', () => {
    const invalid = { users: 15000, dotacion: 1000 }
    const result = validateFormState(invalid)
    
    if (!result.success) {
      expect(Array.isArray(result.errors)).toBe(true)
    }
  })
})

describe('validateField function', () => {
  it('should return null for valid field values', () => {
    expect(validateField('users', 5)).toBeNull()
    expect(validateField('users', 100)).toBeNull()
    expect(validateField('normKey', 'ras')).toBeNull()
    expect(validateField('dotacion', 150)).toBeNull()
  })

  it('should return error message for invalid field values', () => {
    const error = validateField('users', -5)
    expect(error).not.toBeNull()
    expect(typeof error).toBe('string')
  })

  it('should validate users field', () => {
    expect(validateField('users', 0)).not.toBeNull()
    expect(validateField('users', 1)).toBeNull()
    expect(validateField('users', 10001)).not.toBeNull()
  })

  it('should validate dotacion field', () => {
    expect(validateField('dotacion', 5)).not.toBeNull()
    expect(validateField('dotacion', 100)).toBeNull()
    expect(validateField('dotacion', 600)).not.toBeNull()
  })

  it('should validate temperature field', () => {
    expect(validateField('temp', -20)).not.toBeNull()
    expect(validateField('temp', 20)).toBeNull()
    expect(validateField('temp', 60)).not.toBeNull()
  })

  it('should validate depth field', () => {
    expect(validateField('depth', 0.5)).not.toBeNull()
    expect(validateField('depth', 1.5)).toBeNull()
    expect(validateField('depth', 10)).not.toBeNull()
  })

  it('should validate cleanYears field', () => {
    expect(validateField('cleanYears', 0)).not.toBeNull()
    expect(validateField('cleanYears', 5)).toBeNull()
    expect(validateField('cleanYears', 30)).not.toBeNull()
  })

  it('should validate normKey field', () => {
    expect(validateField('normKey', 'ras')).toBeNull()
    expect(validateField('normKey', 'invalid')).not.toBeNull()
  })

  it('should handle undefined values gracefully', () => {
    const result = validateField('users', undefined)
    expect(result).toBeNull() // undefined is allowed (optional field)
  })
})
