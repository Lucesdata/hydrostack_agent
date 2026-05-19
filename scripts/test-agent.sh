#!/bin/bash

# Test script for Hydro_Agent endpoint
# Usage: ANTHROPIC_API_KEY=sk-ant-... ./scripts/test-agent.sh

set -e

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ ANTHROPIC_API_KEY not set."
  echo "   Export it: export ANTHROPIC_API_KEY=sk-ant-..."
  exit 1
fi

API_URL="${API_URL:-http://localhost:3000/api/agent}"

echo "🧪 Testing Hydro_Agent..."
echo "   Endpoint: $API_URL"
echo ""

# Test case: Vivienda unifamiliar de 4 dormitorios
MESSAGE="Necesito dimensionar la fosa séptica de una casa rural de 4 dormitorios en el Pirineo. ¿Cuál sería el volumen?"

echo "📝 User message:"
echo "   \"$MESSAGE\""
echo ""

echo "🔄 Calling /api/agent..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$MESSAGE\"}")

echo "✅ Response received:"
echo "$RESPONSE" | jq .

echo ""
echo "📊 Summary:"
echo "$RESPONSE" | jq '{
  reply_length: (.reply | length),
  num_tool_calls: (.toolCalls | length),
  tool_names: (.toolCalls | map(.name)),
  volumen_util: (.toolCalls[0].output.volumen_util_litros),
  dimensiones: (.toolCalls[0].output.dimensiones)
}' || echo "   (Could not parse response)"
