"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { SISTEMAS_BUSQUEDA, ACTIVIDADES_BUSQUEDA } from "@/src/lib/secop/busqueda-guiada";
import { consultaDesdeParametros, enlaceBusqueda } from "@/src/lib/secop/busqueda-navegacion";
import type { SecopProceso, SecopQuery, SecopResult } from "@/src/lib/secop/types";
import ResultadosBusquedaServidor from "@/src/components/secop/ResultadosBusquedaServidor";
import { crearCargaBusqueda, rechazoDeConsulta, type EstadoBusqueda } from "./carga-busqueda";
import styles from "./buscador-guiado.module.css";

interface Props {
  variante?: "hero" | "explorador";
  consultaInicial?: SecopQuery;
  resultadoInicial?: SecopResult<SecopProceso> | null;
  errorInicial?: string | null;
}
const inicial: SecopQuery = { modo: "tema", apertura: "Abierto", page: 1, pageSize: 25 };
const temaDesde = (query: SecopQuery) => ({
  sistema: query.sistema ?? "",
  actividad: query.actividad ?? "",
  q: query.q ?? "",
  apertura: query.apertura ?? "",
  orden: query.orden ?? "fecha",
});

export default function BuscadorGuiado({
  variante = "hero",
  consultaInicial = inicial,
  resultadoInicial = null,
  errorInicial = null,
}: Props) {
  const compacto = variante === "hero";
  const uid = useId();
  const [modo, setModo] = useState(consultaInicial.modo ?? "tema");
  const [tema, setTema] = useState(temaDesde(consultaInicial));
  const [numero, setNumero] = useState(consultaInicial.numero ?? "");
  const [estado, setEstado] = useState<EstadoBusqueda>({
    consulta: consultaInicial,
    resultado: resultadoInicial,
    error: errorInicial,
    cargando: false,
  });
  const carga = useMemo(() => crearCargaBusqueda(setEstado), []);
  useEffect(() => () => carga.cancelar(), [carga]);
  useEffect(() => {
    if (compacto) return;
    const volver = () => {
      try {
        const query = consultaDesdeParametros(new URLSearchParams(window.location.search));
        if (!query.modo) {
          window.location.reload();
          return;
        }
        setModo(query.modo);
        setTema(temaDesde(query));
        setNumero(query.numero ?? "");
        carga.cargar(query);
      } catch (error) {
        carga.cancelar();
        setEstado(rechazoDeConsulta(inicial, error));
      }
    };
    window.addEventListener("popstate", volver);
    return () => window.removeEventListener("popstate", volver);
  }, [carga, compacto]);

  const ejecutar = (query: SecopQuery) => {
    if (!compacto) {
      const href = enlaceBusqueda(query);
      if (`${window.location.pathname}${window.location.search}` !== href)
        window.history.pushState(null, "", href);
    }
    carga.cargar(query);
  };
  const enviar = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) =>
      params.set(key, String(value).trim())
    );
    try {
      const query = consultaDesdeParametros(params);
      ejecutar({ ...query, pageSize: compacto ? 5 : query.pageSize });
    } catch (error) {
      carga.cancelar();
      setEstado(rechazoDeConsulta(estado.consulta, error));
    }
  };
  const cambiarModo = (nuevo: "tema" | "numero") => {
    carga.cancelar();
    setModo(nuevo);
    setEstado({ consulta: { modo: nuevo }, resultado: null, error: null, cargando: false });
  };
  const campo =
    (key: keyof typeof tema) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setTema((actual) => ({ ...actual, [key]: event.target.value }));
  const estadoTexto = estado.cargando
    ? "Buscando procesos…"
    : estado.resultado
      ? `${estado.resultado.total?.toLocaleString("es-CO") ?? estado.resultado.items.length} resultados${estado.consulta.modo === "numero" ? " por número" : " para estos filtros"}.`
      : "";

  return (
    <section
      className={`${styles.buscador} ${compacto ? "" : styles.claro}`}
      aria-label="Buscador guiado de procesos"
    >
      <fieldset className={styles.selector}>
        <legend className="sr-only">Cómo quieres buscar</legend>
        <input
          className={styles.radioTema}
          type="radio"
          name={`entrada-${uid}`}
          id={`${uid}-tema`}
          checked={modo === "tema"}
          onChange={() => cambiarModo("tema")}
        />
        <label className={styles.pestana} htmlFor={`${uid}-tema`}>
          Por tema
        </label>
        <input
          className={styles.radioNumero}
          type="radio"
          name={`entrada-${uid}`}
          id={`${uid}-numero`}
          checked={modo === "numero"}
          onChange={() => cambiarModo("numero")}
        />
        <label className={styles.pestana} htmlFor={`${uid}-numero`}>
          Por número
        </label>
        <a className={styles.pestana} href="/mis-procesos">
          Mis procesos
        </a>
        <div className={styles.formularios}>
          <form
            className={styles.formTema}
            action="/licitaciones/explorar"
            method="get"
            onSubmit={enviar}
          >
            <input type="hidden" name="modo" value="tema" />
            <input type="hidden" name="page" value="1" />
            <input
              type="hidden"
              name="pageSize"
              value={compacto ? 25 : (estado.consulta.pageSize ?? 25)}
            />
            {compacto && <input type="hidden" name="apertura" value="Abierto" />}
            <div className={styles.campos}>
              <label htmlFor={`${uid}-sistema`}>
                Sistema
                <select
                  id={`${uid}-sistema`}
                  name="sistema"
                  value={tema.sistema}
                  onChange={campo("sistema")}
                >
                  <option value="">Todos los sistemas</option>
                  {SISTEMAS_BUSQUEDA.map((opcion) => (
                    <option value={opcion.value} key={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={`${uid}-actividad`}>
                Actividad
                <select
                  id={`${uid}-actividad`}
                  name="actividad"
                  value={tema.actividad}
                  onChange={campo("actividad")}
                >
                  <option value="">Todas las actividades</option>
                  {ACTIVIDADES_BUSQUEDA.map((opcion) => (
                    <option value={opcion.value} key={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label htmlFor={`${uid}-q`}>
              Palabra o entidad <span className={styles.opcional}>· opcional</span>
              <input
                id={`${uid}-q`}
                name="q"
                value={tema.q}
                onChange={campo("q")}
                maxLength={120}
                placeholder="Bombeo, laboratorio…"
                autoComplete="off"
              />
            </label>
            {!compacto && (
              <div className={styles.campos}>
                <label htmlFor={`${uid}-apertura`}>
                  Apertura
                  <select
                    id={`${uid}-apertura`}
                    name="apertura"
                    value={tema.apertura}
                    onChange={campo("apertura")}
                  >
                    <option value="Abierto">Abiertos</option>
                    <option value="Cerrado">Cerrados</option>
                    <option value="">Abiertos y cerrados</option>
                  </select>
                </label>
                <label htmlFor={`${uid}-orden`}>
                  Orden
                  <select
                    id={`${uid}-orden`}
                    name="orden"
                    value={tema.orden}
                    onChange={campo("orden")}
                  >
                    <option value="fecha">Recientes primero</option>
                    <option value="valor">Mayor valor primero</option>
                  </select>
                </label>
              </div>
            )}
            <div className={styles.acciones}>
              <button className={styles.buscar} type="submit">
                Buscar procesos
              </button>
              {compacto && <span>Abiertos · Colombia</span>}
            </div>
          </form>
          <form
            className={styles.formNumero}
            action="/licitaciones/explorar"
            method="get"
            onSubmit={enviar}
          >
            <input type="hidden" name="modo" value="numero" />
            <input type="hidden" name="page" value="1" />
            <input
              type="hidden"
              name="pageSize"
              value={compacto ? 25 : (estado.consulta.pageSize ?? 25)}
            />
            <label htmlFor={`${uid}-numero-proceso`}>
              Número del proceso
              <input
                id={`${uid}-numero-proceso`}
                name="numero"
                value={numero}
                onChange={(event) => setNumero(event.target.value)}
                required
                maxLength={120}
                placeholder="CO1.REQ.5720221 o referencia"
                autoComplete="off"
                aria-describedby={`${uid}-ayuda`}
              />
            </label>
            <p id={`${uid}-ayuda`} className={styles.ayuda}>
              Identificador SECOP II o referencia de la entidad. Incluye procesos abiertos y
              cerrados.
            </p>
            <button className={styles.buscar} type="submit">
              Buscar proceso
            </button>
          </form>
        </div>
      </fieldset>
      <p className={styles.estado} role="status" aria-live="polite">
        {estadoTexto}
      </p>
      {estado.error && (
        <div className={styles.error} role="alert">
          <p>{estado.error}</p>
          {estado.tipoError !== "validacion" && (
            <a
              href={enlaceBusqueda(estado.consulta)}
              onClick={(event) => {
                event.preventDefault();
                ejecutar(estado.consulta);
              }}
            >
              Reintentar
            </a>
          )}
        </div>
      )}
      {estado.resultado && (
        <ResultadosBusquedaServidor
          resultado={estado.resultado}
          consulta={estado.consulta}
          compacto={compacto}
          onPagina={(page) => ejecutar({ ...estado.consulta, page })}
        />
      )}
    </section>
  );
}
