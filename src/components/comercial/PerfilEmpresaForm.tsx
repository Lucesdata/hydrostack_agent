import { DEPARTAMENTOS } from "@/data/dane/divipola";
import type { EmpresaGuardada, EstadoDato } from "@/src/lib/empresa/servicio";
import { ATRIBUTOS_LISTA } from "@/src/lib/empresa/formulario";
import { ROLES_EMPRESA } from "@/src/lib/empresa/validar";
import { NODOS_TECNOLOGIA } from "@/src/lib/tecnologia/taxonomia-v1";
import s from "./perfil-empresa.module.css";

const ROL: Record<(typeof ROLES_EMPRESA)[number], string> = {
  fabricante_internacional: "Fabricante internacional",
  fabricante_colombiano: "Fabricante colombiano",
  distribuidor_autorizado: "Distribuidor autorizado",
  representante_comercial: "Representante comercial",
  importador: "Importador",
  integrador_tecnologico: "Integrador tecnológico",
  empresa_ingenieria: "Empresa de ingeniería",
  empresa_constructora: "Empresa constructora",
  prestador_servicios_especializados: "Servicios especializados",
  consultora: "Consultora",
  instalacion_mantenimiento: "Instalación y mantenimiento",
  operador_infraestructura: "Operador de infraestructura",
};

const ESTADO: Record<EstadoDato, { glifo: string; texto: string; clase: string }> = {
  declarado: { glifo: "○", texto: "Declarado", clase: s.declared },
  documentado: { glifo: "◆", texto: "Documentado", clase: s.documented },
  verificado: { glifo: "✓", texto: "Verificado", clase: s.verified },
};

const VERIFICACION: Record<string, string> = {
  sin_verificar: "sin verificar",
  en_revision: "en revisión",
  verificada: "verificada",
  rechazada: "rechazada",
  revocada: "revocada",
};

/** Mensajes por campo del validador. Solo se muestran campos conocidos (el parámetro viene de la URL). */
export const MENSAJE_ERROR: Record<string, string> = {
  razonSocial: "Escribe la razón social (máximo 200 caracteres).",
  pais: "El país debe ser un código ISO de 2 letras (por ejemplo DE, US, CO).",
  registroEmpresarial: "El registro empresarial es demasiado largo.",
  sitioOficial: "El sitio oficial debe ser una dirección http:// o https:// válida.",
  roles: "Revisa los roles seleccionados.",
  capacidades: "Revisa las capacidades: no se admiten precios ni listas de precios.",
  cobertura: "Revisa la cobertura territorial.",
  atributos: "Revisa las condiciones comerciales (demasiado largas o no válidas).",
  entrada: "No pudimos leer el formulario. Inténtalo de nuevo.",
  permiso: "Tu cuenta no puede editar el perfil de empresa.",
};

function Estado({ e }: { e: EstadoDato }) {
  const x = ESTADO[e];
  return (
    <span className={`${s.chip} ${x.clase}`}>
      {x.glifo} {x.texto}
    </span>
  );
}

const departamentos = (() => {
  const vistos = new Map<string, string>();
  for (const d of DEPARTAMENTOS) vistos.set(d.departamentoCodigo, d.departamentoNombre);
  return [...vistos.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
})();

/**
 * Perfil de empresa comercial (CI-11b). Componente de servidor: un <form> HTML
 * con una acción de servidor, sin JavaScript de cliente. Lo que el usuario
 * escribe nace «declarado»; `documentado`/`verificado` solo se MUESTRAN (los fija
 * la verificación). Sin campos de precio. Prototipo aprobado:
 * docs/commercial-intelligence/prototipos/02-perfil.html
 */
export default function PerfilEmpresaForm({
  empresa,
  action,
  guardado = false,
  errores = [],
}: {
  empresa: EmpresaGuardada | null;
  action: (formData: FormData) => void | Promise<void>;
  guardado?: boolean;
  errores?: string[];
}) {
  const rolesSel = new Map((empresa?.roles ?? []).map((r) => [r.rol, r.estadoDato]));
  const capsSel = new Map((empresa?.capacidades ?? []).map((c) => [c.nodoCodigo, c]));
  const dptoSel = new Set(
    (empresa?.cobertura ?? []).filter((c) => c.divipola.length === 2).map((c) => c.divipola)
  );
  const municipios = (empresa?.cobertura ?? []).filter((c) => c.divipola.length === 5);
  const attr = (k: string): string => {
    const v = empresa?.atributos?.[k]?.valor;
    return v ? (ATRIBUTOS_LISTA.includes(k) ? v.join(", ") : v.join(" ")) : "";
  };
  const comp = empresa?.completitud;

  return (
    <div className={s.page}>
      <h1 className={s.title}>
        Perfil de empresa <span className={s.muted}>/ Company profile</span>
      </h1>
      <p className={s.lead}>
        Cada dato lleva un estado: <strong>declarado</strong> (lo dices tú),{" "}
        <strong>documentado</strong> (hay un documento) o <strong>verificado</strong> (AquaLicita lo
        comprobó). Lo que escribes aquí nace «declarado».
      </p>

      {guardado ? (
        <p className={s.ok} role="status">
          ✓ Perfil guardado.
        </p>
      ) : null}
      {errores.length > 0 ? (
        <div className={s.errors} role="alert">
          <strong>No pudimos guardar el perfil:</strong>
          <ul>
            {errores.map((c) => (
              <li key={c}>{MENSAJE_ERROR[c]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={s.status}>
        <span>
          Verificación de la empresa:{" "}
          <strong>{VERIFICACION[empresa?.estadoVerificacion ?? "sin_verificar"]}</strong>
        </span>
        {comp ? (
          <span>
            Perfil {comp.porcentaje} %
            {comp.faltan.length ? ` · falta: ${comp.faltan.join(", ")}` : ""}
          </span>
        ) : null}
      </div>
      {comp ? (
        <div
          className={s.meter}
          role="img"
          aria-label={`Perfil completo al ${comp.porcentaje} por ciento`}
        >
          <i style={{ width: `${comp.porcentaje}%` }} />
        </div>
      ) : null}

      <p className={`${s.note} ${s.noteWarn}`}>
        <strong>No subas listas de precios.</strong> El perfil describe capacidades, no tarifas. La
        verificación de AquaLicita no es un sello de cumplimiento legal ni comercial.
      </p>

      <form action={action}>
        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Identidad / Identity</legend>
          <label className={s.label} htmlFor="razonSocial">
            Razón social / Legal name
          </label>
          <input
            className={s.input}
            id="razonSocial"
            name="razonSocial"
            required
            maxLength={200}
            defaultValue={empresa?.razonSocial ?? ""}
          />
          <div className={s.grid2}>
            <div>
              <label className={s.label} htmlFor="pais">
                País (ISO, 2 letras) / Country
              </label>
              <input
                className={s.input}
                id="pais"
                name="pais"
                required
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                defaultValue={empresa?.pais ?? ""}
              />
            </div>
            <div>
              <label className={s.label} htmlFor="registroEmpresarial">
                Registro empresarial / Company registry no.
              </label>
              <input
                className={s.input}
                id="registroEmpresarial"
                name="registroEmpresarial"
                maxLength={80}
                defaultValue={empresa?.registroEmpresarial ?? ""}
              />
            </div>
          </div>
          <label className={s.label} htmlFor="sitioOficial">
            Sitio oficial / Official website
          </label>
          <input
            className={s.input}
            id="sitioOficial"
            name="sitioOficial"
            type="url"
            maxLength={300}
            defaultValue={empresa?.sitioOficial ?? ""}
          />
          <p className={s.muted}>
            Si cambias razón social, país o registro de una empresa <strong>verificada</strong>,
            vuelve a revisión.
          </p>
        </fieldset>

        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Roles / Roles</legend>
          <div className={s.opts}>
            {ROLES_EMPRESA.map((r) => (
              <label className={s.check} key={r}>
                <input type="checkbox" name="rol" value={r} defaultChecked={rolesSel.has(r)} />
                {ROL[r]}
                {rolesSel.has(r) ? <Estado e={rolesSel.get(r) as EstadoDato} /> : null}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Capacidades técnicas / Technical capabilities</legend>
          <p className={s.muted}>
            Categorías de la taxonomía tecnológica. Marcas separadas por comas.
          </p>
          {NODOS_TECNOLOGIA.map((n) => {
            const c = capsSel.get(n.codigo);
            return (
              <div className={`${s.cap} ${n.padre ? s.child : ""}`} key={n.codigo}>
                <div className={s.capHead}>
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      name="cap"
                      value={n.codigo}
                      defaultChecked={Boolean(c)}
                    />
                    <span>
                      {n.nombre_es} <span className={s.muted}>/ {n.nombre_en}</span>
                    </span>
                  </label>
                  {c ? <Estado e={c.estadoDato} /> : null}
                </div>
                <div className={s.capMarcas}>
                  <label className={s.muted} htmlFor={`marcas-${n.codigo}`}>
                    Marcas de {n.nombre_es}
                  </label>
                  <input
                    className={s.input}
                    id={`marcas-${n.codigo}`}
                    name={`marcas:${n.codigo}`}
                    defaultValue={(c?.marcas ?? []).join(", ")}
                  />
                </div>
              </div>
            );
          })}
        </fieldset>

        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Cobertura territorial en Colombia</legend>
          <label className={s.check}>
            <input
              type="checkbox"
              name="coberturaNacional"
              defaultChecked={empresa?.coberturaNacional ?? false}
            />
            Todo el país
          </label>
          <p className={s.muted}>
            Sin cobertura declarada, el matching no puede filtrar por territorio.
          </p>
          <div className={s.opts}>
            {departamentos.map(([codigo, nombre]) => (
              <label className={s.check} key={codigo}>
                <input
                  type="checkbox"
                  name="dpto"
                  value={codigo}
                  defaultChecked={dptoSel.has(codigo)}
                />
                {nombre} ({codigo})
              </label>
            ))}
          </div>
          {municipios.length > 0 ? (
            <p className={s.muted}>
              Municipios ya declarados (se conservan):{" "}
              {municipios.map((m) => m.divipola).join(", ")}.
            </p>
          ) : null}
        </fieldset>

        <fieldset className={s.fieldset}>
          <legend className={s.legend}>
            Condiciones comerciales conocidas / Known commercial terms
          </legend>
          <div className={s.grid2}>
            {(
              [
                ["idiomas", "Idiomas (separados por comas)"],
                ["monedas", "Monedas (separadas por comas)"],
                ["certificaciones", "Certificaciones (separadas por comas)"],
                ["garantias", "Garantías"],
                ["soporte_tecnico", "Soporte técnico"],
                ["repuestos", "Repuestos"],
                ["tiempos_suministro", "Tiempos de suministro"],
                ["capacidad_instalacion", "Capacidad de instalación"],
                ["condiciones_importacion_entrega", "Importación y entrega"],
              ] as const
            ).map(([k, etiqueta]) => (
              <div key={k}>
                <label className={s.label} htmlFor={`attr-${k}`}>
                  {etiqueta}
                </label>
                <input
                  className={s.input}
                  id={`attr-${k}`}
                  name={`attr:${k}`}
                  maxLength={500}
                  defaultValue={attr(k)}
                />
              </div>
            ))}
            <div>
              <label className={s.label} htmlFor="attr-operacion">
                Operación en Colombia
              </label>
              <select
                className={s.input}
                id="attr-operacion"
                name="attr:operacion"
                defaultValue={attr("operacion")}
              >
                <option value="">Sin indicar</option>
                <option value="Directa">Directa</option>
                <option value="Mediante aliado local">Mediante aliado local</option>
              </select>
            </div>
          </div>
        </fieldset>

        <p>
          <button className={s.btn} type="submit">
            Guardar perfil
          </button>
        </p>
      </form>
    </div>
  );
}
