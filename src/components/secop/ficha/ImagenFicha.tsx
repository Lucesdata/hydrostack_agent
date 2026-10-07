"use client";
import Image from "next/image";
import { useRef } from "react";
export default function ImagenFicha() {
  const dialogo = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Image
        className="fi-hero-imagen"
        src="/images/ficha-acueducto.webp"
        alt=""
        fill
        sizes="(max-width: 700px) 100vw, 1280px"
        priority
      />
      <button
        className="fi-imagen-abrir"
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogo.current?.showModal()}
      >
        ⤢ Ver imagen ilustrativa
      </button>
      <dialog
        className="fi-imagen-dialogo"
        ref={dialogo}
        aria-label="Visualización ilustrativa de infraestructura de agua"
      >
        <Image
          src="/images/ficha-acueducto.webp"
          alt="Visualización generada de instalaciones de tratamiento de agua en un paisaje montañoso. No representa esta contratación."
          width={1400}
          height={933}
          sizes="95vw"
        />
        <div>
          <p>
            Visualización generada · Imagen ilustrativa, sin relación documental con este proceso.
          </p>
          <button className="fi-btn" type="button" onClick={() => dialogo.current?.close()}>
            Cerrar
          </button>
        </div>
      </dialog>
    </>
  );
}
