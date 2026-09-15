import PlantaHero from "@/src/components/landing/PlantaHero";

export const metadata = {
  title: "Nosotros",
};

export default function NosotrosPage() {
  return (
    <div className="clr-page">
      <div className="clr-container">
        <header style={{ marginBottom: 22 }}>
          <span className="clr-tag">nosotros</span>
          <h1 className="clr-h1">Un ingeniero especialista, no una startup genérica</h1>
          <p className="clr-sub">
            11 años en agua y saneamiento, planes directores ejecutados y licencia profesional
            vigente — el método detrás de cada indicador que ves en AquaLicita.
          </p>
        </header>

        {/*
          La ilustración isométrica de la planta baja aquí desde la portada.
          Allí competía con el mapa por el primer pliegue sin aportar un dato:
          sus anotaciones técnicas —caudales, cotas, unidades de tratamiento—
          solo trabajan donde se habla del criterio de ingeniería, que es esta
          página. En la portada era decoración; aquí es el argumento.
        */}
        <PlantaHero />
      </div>
    </div>
  );
}
