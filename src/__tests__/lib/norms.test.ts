import { computeNorm, getParams, NORMS_METADATA } from '@/lib/norms'

describe('NORMS_METADATA', () => {
  it('should have all required standards', () => {
    expect(NORMS_METADATA.ras).toBeDefined()
    expect(NORMS_METADATA.esp).toBeDefined()
    expect(NORMS_METADATA.eu).toBeDefined()
    expect(NORMS_METADATA.epa).toBeDefined()
  })

  it('should have correct default dotacion values', () => {
    expect(NORMS_METADATA.ras.defaultDotacion).toBe(120)
    expect(NORMS_METADATA.esp.defaultDotacion).toBe(160)
    expect(NORMS_METADATA.eu.defaultDotacion).toBe(150)
    expect(NORMS_METADATA.epa.defaultDotacion).toBe(190)
  })

  it('should have correct flags for each norm', () => {
    expect(NORMS_METADATA.ras.flag).toBe('🇨🇴')
    expect(NORMS_METADATA.esp.flag).toBe('🇪🇸')
    expect(NORMS_METADATA.eu.flag).toBe('🇪🇺')
    expect(NORMS_METADATA.epa.flag).toBe('🇺🇸')
  })
})

describe('getParams', () => {
  it('should return temperature-adjusted RAS parameters', () => {
    const warmParams = getParams('ras', 25)
    expect(warmParams.trhDays).toBe(1.5)
    expect(warmParams.tempLabel).toBe('T ≥ 20°C')

    const midParams = getParams('ras', 15)
    expect(midParams.trhDays).toBe(2.0)
    expect(midParams.tempLabel).toBe('T 10–19°C')

    const coldParams = getParams('ras', 8)
    expect(coldParams.trhDays).toBe(2.5)
    expect(coldParams.tempLabel).toBe('T < 10°C')
  })

  it('should adjust ESP parameters by temperature', () => {
    const warmParams = getParams('esp', 16)
    expect(warmParams.trhDays).toBe(1.0)
    expect(warmParams.tempLabel).toBe('T ≥ 15°C')

    const coldParams = getParams('esp', 12)
    expect(coldParams.trhDays).toBe(1.5)
    expect(coldParams.tempLabel).toBe('T < 15°C')
  })

  it('should adjust EU (EN 12566) parameters by temperature', () => {
    const warmParams = getParams('eu', 16)
    expect(warmParams.trhDays).toBe(2.0)
    expect(warmParams.tempLabel).toBe('T ≥ 15°C')

    const coolParams = getParams('eu', 10)
    expect(coolParams.trhDays).toBe(3.0)
    expect(coolParams.tempLabel).toBe('T 5–14°C')

    const coldParams = getParams('eu', 2)
    expect(coldParams.trhDays).toBe(4.0)
    expect(coldParams.tempLabel).toBe('T < 5°C')
  })

  it('should adjust EPA parameters by temperature', () => {
    const warmParams = getParams('epa', 16)
    expect(warmParams.trhDays).toBe(1.5)
    expect(warmParams.tempLabel).toBe('T ≥ 15°C')

    const coldParams = getParams('epa', 12)
    expect(coldParams.trhDays).toBe(2.0)
    expect(coldParams.tempLabel).toBe('T < 15°C')
  })
})

describe('computeNorm', () => {
  it('should calculate volumes for 5 users RAS 20°C', () => {
    const result = computeNorm('ras', 5, 120, 0.75, 20, 3, 1.5)
    
    // Qd = (5 * 120 * 0.75) / 1000 = 0.45
    // Vl = Qd * trhDays = 0.45 * 1.5 = 0.675
    expect(result.Vl).toBeCloseTo(0.675, 2)
    // Vs = (5 * 40 * 3) / 1000 = 0.6
    expect(result.Vs).toBeCloseTo(0.6, 1)
    // Vn = 0.3 * Vl = 0.3 * 0.675 = 0.2025
    expect(result.Vn).toBeCloseTo(0.2025, 2)
    // Vtot should be >= minVolume (1.0)
    expect(result.Vtot).toBeGreaterThanOrEqual(1.0)
  })

  it('should return correct chamber count', () => {
    // 1 chamber: users ≤ 5, Vtot ≤ 2
    const result1 = computeNorm('ras', 3, 120, 0.75, 20, 3, 1.5)
    expect(result1.chambers).toBe(1)

    // 2 chambers: 5 < users ≤ 50, 2 < Vtot ≤ 10
    const result2 = computeNorm('ras', 10, 120, 0.75, 20, 3, 1.5)
    expect(result2.chambers).toBe(2)

    // 3 chambers: users > 50 or Vtot > 10
    const result3 = computeNorm('ras', 100, 120, 0.75, 20, 3, 1.5)
    expect(result3.chambers).toBe(3)
  })

  it('should apply minimum volume when required', () => {
    const result = computeNorm('ras', 1, 50, 0.75, 20, 3, 1.5)
    expect(result.minA).toBe(true)
    expect(result.Vtot).toBe(1.0) // RAS minimum
  })

  it('should apply EPA minimum volume (3.785 m³)', () => {
    const result = computeNorm('epa', 1, 50, 0.75, 20, 3, 1.5)
    expect(result.minA).toBe(true)
    expect(result.Vtot).toBe(3.785) // EPA minimum
  })

  it('should calculate SRT correctly', () => {
    const result = computeNorm('ras', 5, 120, 0.75, 20, 3, 1.5)
    expect(result.SRT).toBeGreaterThan(0)
    expect(typeof result.SRT).toBe('number')
  })

  it('should calculate correct dimensions from volume and depth', () => {
    const result = computeNorm('ras', 5, 120, 0.75, 20, 3, 1.5)
    // Area = Vtot / depth
    const expectedArea = result.Vtot / 1.5
    expect(result.Area).toBeCloseTo(expectedArea, 2)
    // W = sqrt(Area / 2)
    const expectedW = Math.sqrt(expectedArea / 2)
    expect(result.W).toBeCloseTo(expectedW, 2)
    // L = 2 * W
    const expectedL = 2 * expectedW
    expect(result.L).toBeCloseTo(expectedL, 2)
  })

  it('should work with all standards', () => {
    const standards = ['ras', 'esp', 'eu', 'epa'] as const
    standards.forEach(std => {
      const result = computeNorm(std, 5, 120, 0.75, 20, 3, 1.5)
      expect(result.Vtot).toBeGreaterThan(0)
      expect(result.L).toBeGreaterThan(0)
      expect(result.W).toBeGreaterThan(0)
      expect(result.chambers).toBeGreaterThan(0)
      expect(result.SRT).toBeGreaterThan(0)
    })
  })

  it('should handle different retention coefficients', () => {
    const result75 = computeNorm('ras', 5, 120, 0.75, 20, 3, 1.5)
    const result60 = computeNorm('ras', 5, 120, 0.6, 20, 3, 1.5)
    
    // Lower retention coef = lower Qd = lower Vl
    expect(result60.Vl).toBeLessThan(result75.Vl)
  })

  it('should handle extreme values', () => {
    // Very large users
    const resultLarge = computeNorm('ras', 5000, 120, 0.75, 20, 3, 1.5)
    expect(resultLarge.Vtot).toBeGreaterThan(100)
    expect(resultLarge.chambers).toBe(3)

    // Very small users
    const resultSmall = computeNorm('ras', 1, 120, 0.75, 20, 3, 1.5)
    expect(resultSmall.minA).toBe(true)
    expect(resultSmall.Vtot).toBeGreaterThanOrEqual(1.0)
  })
})
