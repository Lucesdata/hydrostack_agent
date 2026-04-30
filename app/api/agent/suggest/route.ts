import { suggestNextQuestions } from "@/src/lib/agent/filter"
import type { FormState } from "@/src/lib/agent/filter"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { formState, conversationHistory } = await req.json() as {
      formState?: FormState
      conversationHistory?: string[]
    }

    if (!formState) {
      return new Response(
        JSON.stringify({ error: "formState is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const suggestions = suggestNextQuestions(formState, conversationHistory)

    return new Response(
      JSON.stringify({
        suggestions: suggestions.map(q => ({
          id: q.id,
          route: q.route,
          text: q.text,
          intent: q.intent,
          references: q.references,
        })),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
