// Keep renderer/module failures inside the decorative scene and tell the card to use its fallback.
import("./app.js").catch((error) => {
  console.error("[agua-viva] No se pudo iniciar la escena:", error);
  window.parent.postMessage({ type: "agua-viva:error" }, window.location.origin);
});
