// src/components/secop/discovery/SmartCollections.tsx
"use client";

/**
 * Colecciones inteligentes — 3 accesos rápidos con filtros pre-armados.
 * El usuario nunca configura nada: hace clic y el set de pills objetivas
 * se aplica solo. Sin onboarding, sin preguntas sobre el usuario.
 */

import { SMART_COLLECTIONS } from "@/src/lib/secop/discovery";

interface Props {
  activeCollectionIds: Set<string>;
  onToggle: (collectionId: string) => void;
}

export default function SmartCollections({ activeCollectionIds, onToggle }: Props) {
  return (
    <div className="clr-disc-collections" role="list" aria-label="Colecciones inteligentes">
      {SMART_COLLECTIONS.map((c) => {
        const isActive = activeCollectionIds.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            role="listitem"
            aria-pressed={isActive}
            className={`clr-disc-collection${isActive ? " is-active" : ""}`}
            onClick={() => onToggle(c.id)}
          >
            <span className="clr-disc-collection-glyph" aria-hidden="true">{c.glyph}</span>
            <span className="clr-disc-collection-title">{c.titulo}</span>
            <span className="clr-disc-collection-desc">{c.descripcion}</span>
          </button>
        );
      })}
    </div>
  );
}
