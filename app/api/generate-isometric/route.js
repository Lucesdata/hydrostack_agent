export async function POST(request) {
  try {
    const { prompt, systemParams } = await request.json();

    if (!prompt) {
      return Response.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Call Claude API directly via HTTP
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `${prompt}

Por favor proporciona una descripción visual detallada de este dibujo isométrico técnico que pueda usarse para generar una imagen de alta calidad. Incluye:
1. Composición general y perspectiva
2. Esquema de colores y apariencia de materiales
3. Ubicación específica de dimensiones y etiquetas
4. Detalles técnicos y vistas de corte
5. Estilos de anotación profesional

Formatea como una descripción visual detallada adecuada para un modelo de generación de imágenes.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API request failed");
    }

    const data = await response.json();
    const description = data.content[0]?.text || "";

    // Return the description along with metadata
    // In production, you would send this to an image generation service (DALL-E, Midjourney, Stable Diffusion, etc.)
    return Response.json({
      description,
      systemParams,
      message: "Image generation description created successfully. Connect to DALL-E or Midjourney for final image.",
      imageUrl: null,
      note: "Para generar la imagen final, integra este endpoint con DALL-E (OpenAI) o Midjourney API",
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return Response.json(
      { error: error.message || "Failed to generate description" },
      { status: 500 }
    );
  }
}
