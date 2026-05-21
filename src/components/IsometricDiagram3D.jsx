"use client";
import { useEffect, useRef } from "react";
import * as BABYLON from "babylonjs";

const DS = {
  cyanBright: "#00F5FF",
  greenBright: "#00FF88",
  amberBright: "#FFB020",
  bgDark: "#020C10",
  bgCard: "#041820",
  textMain: "#E8F8FF",
  textMuted: "#4A7A8A",
  border: "rgba(0, 245, 255, 0.12)",
};

export default function IsometricDiagram3D({ r, projectName = "Proyecto", location = "Sitio", designer = "Diseño" }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !r) return;

    // Create engine and scene
    const engine = new BABYLON.Engine(canvasRef.current, true);
    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    // Scene settings
    scene.clearColor = new BABYLON.Color3(2 / 255, 12 / 255, 16 / 255); // bgDark
    scene.collisionsEnabled = true;

    // ===== LIGHTING =====
    // Ambient light
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.7;
    ambientLight.specular = new BABYLON.Color3(0.2, 0.2, 0.2);

    // Directional light (sun)
    const dirLight = new BABYLON.PointLight("dirLight", new BABYLON.Vector3(20, 30, 20), scene);
    dirLight.intensity = 1.2;
    dirLight.range = 200;
    dirLight.specular = new BABYLON.Color3(1, 1, 1);

    // ===== GROUND =====
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuse = new BABYLON.Color3(0.5, 0.4, 0.3); // Brown grass
    groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMat;

    // ===== HOUSE =====
    const houseGroup = new BABYLON.TransformNode("houseGroup", scene);

    // House base
    const houseBase = BABYLON.MeshBuilder.CreateBox("houseBase", { width: 8, height: 0.5, depth: 8 }, scene);
    houseBase.position = new BABYLON.Vector3(-15, 0.25, 0);
    const houseBmat = new BABYLON.StandardMaterial("houseBmat", scene);
    houseBmat.diffuse = new BABYLON.Color3(0.6, 0.4, 0.2); // Wood color
    houseBase.material = houseBmat;

    // House walls
    const houseWalls = BABYLON.MeshBuilder.CreateBox("houseWalls", { width: 8, height: 6, depth: 8 }, scene);
    houseWalls.position = new BABYLON.Vector3(-15, 3, 0);
    const houseWmat = new BABYLON.StandardMaterial("houseWmat", scene);
    houseWmat.diffuse = new BABYLON.Color3(0.85, 0.75, 0.65); // Light tan
    houseWalls.material = houseWmat;

    // House roof
    const roofPyramid = BABYLON.MeshBuilder.CreateCylinder("roof", { diameter: 10, height: 3, tessellation: 4 }, scene);
    roofPyramid.position = new BABYLON.Vector3(-15, 9, 0);
    roofPyramid.rotation.z = Math.PI / 4;
    const roofMat = new BABYLON.StandardMaterial("roofMat", scene);
    roofMat.diffuse = new BABYLON.Color3(0.6, 0.2, 0.1); // Red terracotta
    roofPyramid.material = roofMat;

    // Door
    const door = BABYLON.MeshBuilder.CreateBox("door", { width: 1.5, height: 2.5, depth: 0.2 }, scene);
    door.position = new BABYLON.Vector3(-15, 2, 4.1);
    const doorMat = new BABYLON.StandardMaterial("doorMat", scene);
    doorMat.diffuse = new BABYLON.Color3(0.3, 0.15, 0.05); // Dark brown
    door.material = doorMat;

    // Windows (2)
    for (let i = 0; i < 2; i++) {
      const window = BABYLON.MeshBuilder.CreateBox("window_" + i, { width: 1.2, height: 1, depth: 0.15 }, scene);
      window.position = new BABYLON.Vector3(-15 + (i * 3), 4.5, 4.05);
      const winMat = new BABYLON.StandardMaterial("winMat_" + i, scene);
      winMat.diffuse = new BABYLON.Color3(0.4, 0.8, 1); // Light blue
      winMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
      window.material = winMat;
    }

    // ===== DRAINAGE PIPES =====
    const pipeGroup = new BABYLON.TransformNode("pipeGroup", scene);

    // Main pipe from house to tank (curve)
    const tubeArray = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = -15 + t * 20;
      const y = 1 + t * 0.5 - (t * t) * 0.3; // Curved down
      const z = -t * 8;
      tubeArray.push(new BABYLON.Vector3(x, y, z));
    }

    const tubePath = BABYLON.MeshBuilder.CreateTube("pipe", { path: tubeArray, radius: 0.15, updatable: false }, scene);
    const pipeMat = new BABYLON.StandardMaterial("pipeMat", scene);
    pipeMat.diffuse = new BABYLON.Color3(1, 0.55, 0); // Orange PVC
    pipeMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    tubePath.material = pipeMat;

    // ===== SEPTIC TANK =====
    const tankGroup = new BABYLON.TransformNode("tankGroup", scene);

    // Tank dimensions
    const tankL = (r.L || 3) * 2;
    const tankW = (r.W || 1.5) * 2;
    const tankD = (r.depth || 1.4) * 2;

    // Buried tank body
    const tank = BABYLON.MeshBuilder.CreateBox("tank", { width: tankW, height: tankD, depth: tankL }, scene);
    tank.position = new BABYLON.Vector3(10, -tankD / 2, -8);
    const tankMat = new BABYLON.StandardMaterial("tankMat", scene);
    tankMat.diffuse = new BABYLON.Color3(0.5, 0.5, 0.5); // Concrete gray
    tankMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    tank.material = tankMat;

    // Tank lid (top)
    const lid = BABYLON.MeshBuilder.CreateBox("lid", { width: tankW + 0.2, height: 0.3, depth: tankL + 0.2 }, scene);
    lid.position = new BABYLON.Vector3(10, tankD / 2 + 0.15, -8);
    const lidMat = new BABYLON.StandardMaterial("lidMat", scene);
    lidMat.diffuse = new BABYLON.Color3(0.4, 0.4, 0.4);
    lid.material = lidMat;

    // Water inside tank (semi-transparent blue)
    const waterLevel = tankD * 0.65;
    const water = BABYLON.MeshBuilder.CreateBox("water", { width: tankW - 0.4, height: waterLevel, depth: tankL - 0.4 }, scene);
    water.position = new BABYLON.Vector3(10, -tankD / 2 + waterLevel / 2, -8);
    const waterMat = new BABYLON.StandardMaterial("waterMat", scene);
    waterMat.diffuse = new BABYLON.Color3(0, 0.6, 0.8);
    waterMat.alpha = 0.4;
    water.material = waterMat;

    // Tank vent (small pipe)
    const vent = BABYLON.MeshBuilder.CreateCylinder("vent", { diameter: 0.15, height: 1.5 }, scene);
    vent.position = new BABYLON.Vector3(10 + tankW / 3, tankD / 2 + 1, -8);
    const ventMat = new BABYLON.StandardMaterial("ventMat", scene);
    ventMat.diffuse = new BABYLON.Color3(0.3, 0.3, 0.3);
    vent.material = ventMat;

    // Inlet pipe
    const inletPipe = BABYLON.MeshBuilder.CreateCylinder("inlet", { diameter: 0.1, height: 0.3 }, scene);
    inletPipe.position = new BABYLON.Vector3(10 - tankW / 2 - 0.2, 0, -8);
    inletPipe.rotation.z = Math.PI / 2;
    const inletMat = new BABYLON.StandardMaterial("inletMat", scene);
    inletMat.diffuse = new BABYLON.Color3(0, 1, 0); // Green inlet
    inletPipe.material = inletMat;

    // Outlet pipe
    const outletPipe = BABYLON.MeshBuilder.CreateCylinder("outlet", { diameter: 0.1, height: 0.3 }, scene);
    outletPipe.position = new BABYLON.Vector3(10 + tankW / 2 + 0.2, -tankD / 3, -8);
    outletPipe.rotation.z = Math.PI / 2;
    const outletMat = new BABYLON.StandardMaterial("outletMat", scene);
    outletMat.diffuse = new BABYLON.Color3(1, 0.7, 0); // Amber outlet
    outletPipe.material = outletMat;

    // ===== INFILTRATION FIELD =====
    const fieldGroup = new BABYLON.TransformNode("fieldGroup", scene);

    // Field border
    const fieldBorder = BABYLON.MeshBuilder.CreateGround("fieldBorder", { width: 12, height: 10 }, scene);
    fieldBorder.position = new BABYLON.Vector3(30, 0.05, -8);
    const fieldBorderMat = new BABYLON.StandardMaterial("fieldBorderMat", scene);
    fieldBorderMat.diffuse = new BABYLON.Color3(0.6, 0.5, 0.3); // Sand color
    fieldBorderMat.wireframe = true;
    fieldBorder.material = fieldBorderMat;

    // Infiltration trenches
    const trenchCount = 5;
    for (let i = 0; i < trenchCount; i++) {
      const trench = BABYLON.MeshBuilder.CreateTube(
        "trench_" + i,
        {
          path: [
            new BABYLON.Vector3(24, 0, -8 + (i - 2) * 2.5),
            new BABYLON.Vector3(36, 0, -8 + (i - 2) * 2.5),
          ],
          radius: 0.3,
          updatable: false,
        },
        scene
      );
      const trenchMat = new BABYLON.StandardMaterial("trenchMat_" + i, scene);
      trenchMat.diffuse = new BABYLON.Color3(0.8, 0.6, 0.3); // Gravel
      trench.material = trenchMat;
    }

    // ===== CAMERA =====
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 2.5, // alpha
      Math.PI / 2.3, // beta
      60, // radius
      new BABYLON.Vector3(5, 2, -5)
    );
    camera.attachControl(canvasRef.current, true);
    camera.wheelDeltaPercentage = 0.01;
    camera.lowerRadiusLimit = 30;
    camera.upperRadiusLimit = 150;

    // ===== ANIMATION LOOP =====
    engine.runRenderLoop(() => {
      // Gentle rotation of the scene
      // scene.rotation.y += 0.0001;
      scene.render();
    });

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current) {
        engine.resize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
    };
  }, [r]);

  const fmt = (v, d = 2) => Number(v).toFixed(d);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "16px" }}>
      {/* Canvas 3D */}
      <div style={{ flex: 1, position: "relative", borderRadius: "4px", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            background: DS.bgDark,
          }}
        />

        {/* Overlay instructions */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            fontSize: "11px",
            color: DS.textMuted,
            fontFamily: "monospace",
            background: "rgba(2,12,16,0.8)",
            padding: "8px 12px",
            borderRadius: "3px",
            border: `1px solid ${DS.border}`,
          }}
        >
          🖱️ Arrastra para rotar · 🔍 Scroll para zoom
        </div>
      </div>

      {/* DATA PANEL */}
      <div
        style={{
          background: DS.bgCard,
          border: `1px solid ${DS.border}`,
          borderRadius: "4px",
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}
      >
        <div>
          <span style={{ color: DS.textMuted }}>Usuarios:</span>
          <div style={{ color: DS.cyanBright, fontWeight: "bold" }}>{r.users || 5}</div>
        </div>
        <div>
          <span style={{ color: DS.textMuted }}>Vol. Fosa:</span>
          <div style={{ color: DS.greenBright, fontWeight: "bold" }}>{fmt(r.Vtot)} m³</div>
        </div>
        <div>
          <span style={{ color: DS.textMuted }}>L × W × D:</span>
          <div style={{ color: DS.cyanBright, fontWeight: "bold" }}>
            {fmt(r.L)} × {fmt(r.W)} × {fmt(r.depth)} m
          </div>
        </div>
        <div>
          <span style={{ color: DS.textMuted }}>TRH:</span>
          <div style={{ color: DS.amberBright, fontWeight: "bold" }}>{fmt(r.trhDays, 1)} días</div>
        </div>
        <div>
          <span style={{ color: DS.textMuted }}>SRT:</span>
          <div style={{ color: DS.greenBright, fontWeight: "bold" }}>{fmt(r.SRT)} días</div>
        </div>
        <div>
          <span style={{ color: DS.textMuted }}>Caudal:</span>
          <div style={{ color: DS.cyanBright, fontWeight: "bold" }}>{fmt(r.Qd * 1000)} L/día</div>
        </div>
        <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${DS.border}`, paddingTop: "8px", marginTop: "8px" }}>
          <div style={{ color: DS.textMuted, marginBottom: "4px" }}>Proyecto:</div>
          <div style={{ color: DS.textMain }}>{projectName}</div>
          <div style={{ color: DS.textMuted, marginTop: "6px", marginBottom: "4px" }}>Ubicación:</div>
          <div style={{ color: DS.textMain }}>{location}</div>
          <div style={{ color: DS.textMuted, marginTop: "6px", marginBottom: "4px" }}>Diseño:</div>
          <div style={{ color: DS.textMain }}>{designer}</div>
        </div>
      </div>
    </div>
  );
}
