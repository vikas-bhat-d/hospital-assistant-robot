import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

export default function PoseViewer() {

  const canvasRef = useRef(null);
  const clientRef = useRef(null);

  const [pose, setPose] = useState({ x: 0, y: 0, theta: 0 });
  const [goals, setGoals] = useState([]);

  const [obstacles, setObstacles] = useState([]);
  const [pins, setPins] = useState([]);

  const currentPolyRef = useRef([]);
  const draggingRef = useRef(null);

  const WORLD = useRef({
    minX: -1,
    maxX: 6,
    minY: -1,
    maxY: 6
  });

  const mapStateRef = useRef({
    world: WORLD.current,
    obstacles: [],
    pins: []
  });

  const LS_KEY = "ROBOT_MAP_STATE_V2";

  // =====================================================
  // BACKEND SYNC — OBSTACLES
  // =====================================================
  const syncObstacles = async (obs) => {
    try {
      await fetch("http://localhost:4000/api/robo/set-obstacles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          world: WORLD.current,
          obstacles: obs
        })
      });
      console.log("✔ Obstacles synced");
    } catch (e) {
      console.warn("⚠ Failed to sync obstacles", e);
    }
  };

  // =====================================================
  // BACKEND SYNC — PINS
  // =====================================================
  const syncPins = async (pinsList) => {
    try {
      await fetch("http://localhost:4000/api/robo/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pins: pinsList })
      });

      console.log("✔ Pins synced");
    } catch (e) {
      console.warn("⚠ Failed to sync pins", e);
    }
  };

  // =====================================================
  // STORAGE SAVE
  // =====================================================
  const saveMap = (obs, pinList) => {

    const data = {
      world: WORLD.current,
      obstacles: obs ?? obstacles,
      pins: pinList ?? pins
    };

    mapStateRef.current = data;

    localStorage.setItem(LS_KEY, JSON.stringify(data));

    syncObstacles(data.obstacles);
    syncPins(data.pins);
  };

  const loadMap = () => {
    try {
      const txt = localStorage.getItem(LS_KEY);
      if (!txt) return;

      const data = JSON.parse(txt);

      WORLD.current = data.world || WORLD.current;

      setObstacles(data.obstacles || []);
      setPins(data.pins || []);

      mapStateRef.current = data;

      syncObstacles(data.obstacles || []);
      syncPins(data.pins || []);

      console.log("✔ Map restored");

    } catch (e) {
      console.warn("⚠ Failed to restore map", e);
    }
  };

  // =====================================================
  // WORLD <-> CANVAS MAP
  // =====================================================
  function worldToCanvas(p, W, H) {
    const w = WORLD.current;
    return {
      x: (p.x - w.minX) / (w.maxX - w.minX) * W,
      y: H - (p.y - w.minY) / (w.maxY - w.minY) * H
    };
  }

  function canvasToWorld(x, y, W, H) {
    const w = WORLD.current;
    return {
      x: w.minX + (x / W) * (w.maxX - w.minX),
      y: w.minY + ((H - y) / H) * (w.maxY - w.minY)
    };
  }

  // =====================================================
  // MQTT
  // =====================================================
  useEffect(() => {

    loadMap();

    const url = "ws://localhost:9001";
    const client = mqtt.connect(url);
    clientRef.current = client;

    client.on("connect", () => {
      console.log("MQTT Connected");

      client.subscribe("robot/pose");
      client.subscribe("robot/goals");
    });

    client.on("message", (topic, msg) => {
      const payload = msg.toString().trim();

      if (topic === "robot/pose") {
        const kv = Object.fromEntries(payload.split(",").map(s => s.split("=")));

        setPose({
          x: parseFloat(kv.x),
          y: parseFloat(kv.y),
          theta: parseFloat(kv.theta)
        });
      }

      if (topic === "robot/goals") {
        const parsed = payload
          .split(";")
          .filter(t => t.includes(","))
          .map(v => {
            const [x, y] = v.split(",");
            return { x: parseFloat(x), y: parseFloat(y) };
          });

        setGoals(parsed);
      }
    });

    return () => client.end();
  }, []);

  // =====================================================
  // OBSTACLE EDITING
  // =====================================================
  const HIT_RADIUS = 10;

  function hitVertex(pt, W, H) {

    const pC = worldToCanvas(pt, W, H);

    for (let i = 0; i < obstacles.length; i++) {
      for (let j = 0; j < obstacles[i].length; j++) {

        const v = worldToCanvas(obstacles[i][j], W, H);

        if (Math.hypot(v.x - pC.x, v.y - pC.y) <= HIT_RADIUS)
          return { type: "vertex", polyIdx: i, vertIdx: j };
      }
    }
    return null;
  }

  // =====================================================
  // PIN DRAG HIT
  // =====================================================
  function hitPin(pt, W, H) {

    const pC = worldToCanvas(pt, W, H);

    for (let i = 0; i < pins.length; i++) {

      const v = worldToCanvas(pins[i], W, H);

      if (Math.hypot(v.x - pC.x, v.y - pC.y) <= 12)
        return { type: "pin", pinIdx: i };
    }
    return null;
  }

  // =====================================================
  // MOUSE DOWN
  // =====================================================
  const onMouseDown = (e) => {

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const W = canvas.width;
    const H = canvas.height;

    const worldPt = canvasToWorld(x, y, W, H);

    // FIRST — drag pin?
    const pinHit = hitPin(worldPt, W, H);

    if (pinHit) {
      draggingRef.current = pinHit;
      return;
    }

    // NEXT — drag obstacle vertex?
    const hit = hitVertex(worldPt, W, H);

    if (hit) {
      draggingRef.current = hit;
      return;
    }

    // LEFT CLICK — add polygon vertex
    if (e.button === 0 && !e.shiftKey) {

      currentPolyRef.current.push(worldPt);
      drawScene();
      return;
    }

    // SHIFT + LEFT CLICK => add PIN
    if (e.button === 0 && e.shiftKey) {

      const name = prompt("Enter location name:");

      if (!name) return;

      const newPins = [
        ...pins,
        { x: worldPt.x, y: worldPt.y, name }
      ];

      setPins(newPins);

      saveMap(obstacles, newPins);

      drawScene();
      return;
    }

    // RIGHT CLICK — close polygon
    if (e.button === 2 && currentPolyRef.current.length >= 3) {

      const newObs = [
        ...obstacles,
        [...currentPolyRef.current]
      ];

      currentPolyRef.current = [];

      setObstacles(newObs);

      saveMap(newObs, pins);

      drawScene();
    }
  };

  // =====================================================
  // MOUSE MOVE
  // =====================================================
  const onMouseMove = (e) => {

    if (!draggingRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const W = canvas.width;
    const H = canvas.height;

    const worldPt = canvasToWorld(x, y, W, H);

    // dragging a PIN
    if (draggingRef.current.type === "pin") {

      const { pinIdx } = draggingRef.current;

      const updated = pins.map((p, i) =>
        i === pinIdx ? { ...p, x: worldPt.x, y: worldPt.y } : p
      );

      setPins(updated);

      saveMap(obstacles, updated);

      drawScene();
      return;
    }

    // dragging VERTEX
    const { polyIdx, vertIdx } = draggingRef.current;

    const updated = obstacles.map((poly, i) =>
      i === polyIdx
        ? poly.map((v, j) => (j === vertIdx ? worldPt : v))
        : poly
    );

    setObstacles(updated);

    saveMap(updated, pins);

    drawScene();
  };

  const onMouseUp = () => draggingRef.current = null;

  // =====================================================
  // DRAWING
  // =====================================================
  function drawRobot(ctx, W, H) {

    const c = worldToCanvas(pose, W, H);

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-pose.theta * Math.PI / 180);

    ctx.fillStyle = "#00ffaa";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#00ff55";
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-8, 7);
    ctx.lineTo(-8, -7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawPins(ctx, W, H) {

    pins.forEach((p) => {

      const c = worldToCanvas(p, W, H);

      // pin body
      ctx.fillStyle = "#3ea6ff";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // label box
      ctx.fillStyle = "#0b1622";
      ctx.fillRect(c.x + 12, c.y - 10, p.name.length * 8 + 10, 18);

      // label text
      ctx.fillStyle = "#d7e6ef";
      ctx.font = "12px monospace";
      ctx.fillText(p.name, c.x + 16, c.y + 3);
    });
  }

  function drawGoals(ctx, W, H) {
    goals.forEach(g => {
      const c = worldToCanvas(g, W, H);
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawObstacles(ctx, W, H) {

    obstacles.forEach(poly => {

      if (!poly.length) return;

      ctx.fillStyle = "#2a2d31";
      ctx.beginPath();

      const c0 = worldToCanvas(poly[0], W, H);
      ctx.moveTo(c0.x, c0.y);

      for (let i = 1; i < poly.length; i++) {
        const c = worldToCanvas(poly[i], W, H);
        ctx.lineTo(c.x, c.y);
      }

      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.stroke();

      poly.forEach(v => {
        const c = worldToCanvas(v, W, H);
        ctx.fillStyle = "#d7e6ef";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function drawDraftPolygon(ctx, W, H) {

    if (!currentPolyRef.current.length) return;

    ctx.strokeStyle = "#ffaa33";
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;

    ctx.beginPath();

    const c0 = worldToCanvas(currentPolyRef.current[0], W, H);
    ctx.moveTo(c0.x, c0.y);

    for (let i = 1; i < currentPolyRef.current.length; i++) {
      const c = worldToCanvas(currentPolyRef.current[i], W, H);
      ctx.lineTo(c.x, c.y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    currentPolyRef.current.forEach(p => {
      const c = worldToCanvas(p, W, H);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGrid(ctx, W, H) {

    const w = WORLD.current;

    ctx.strokeStyle = "rgba(255,255,255,0.06)";

    for (let x = Math.ceil(w.minX); x <= w.maxX; x++) {
      const c = worldToCanvas({ x, y: 0 }, W, H);
      ctx.beginPath();
      ctx.moveTo(c.x, 0);
      ctx.lineTo(c.x, H);
      ctx.stroke();
    }

    for (let y = Math.ceil(w.minY); y <= w.maxY; y++) {
      const c = worldToCanvas({ x: 0, y }, W, H);
      ctx.beginPath();
      ctx.moveTo(0, c.y);
      ctx.lineTo(W, c.y);
      ctx.stroke();
    }

    const o = worldToCanvas({ x: 0, y: 0 }, W, H);

    ctx.strokeStyle = "rgba(200,200,220,0.35)";

    ctx.beginPath();
    ctx.moveTo(0, o.y);
    ctx.lineTo(W, o.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(o.x, 0);
    ctx.lineTo(o.x, H);
    ctx.stroke();
  }

  function drawScene() {

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    drawGrid(ctx, W, H);
    drawObstacles(ctx, W, H);
    drawDraftPolygon(ctx, W, H);
    drawPins(ctx, W, H);
    drawGoals(ctx, W, H);
    drawRobot(ctx, W, H);
  }

  useEffect(() => { drawScene(); }, [pose, goals, obstacles, pins]);

  // =====================================================
  // EVENT HOOKS
  // =====================================================
  useEffect(() => {

    const canvas = canvasRef.current;

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    canvas.addEventListener("contextmenu", e => e.preventDefault());

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  // =====================================================
  // UI
  // =====================================================
  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      background: "#0f1113",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>

      <h2 style={{ color: "#fff", margin: "10px 0 4px" }}>
        Robot Pose Viewer — Map / Obstacles / Pins
      </h2>

      <div style={{ color: "#9aa3ad", marginBottom: 8 }}>
        Left-click = add obstacle vertex • Right-click = close polygon • Drag = move vertex<br />
        Shift + Click = Add Pin • Drag Pin = Move Pin
      </div>

      <canvas
        ref={canvasRef}
        width={950}
        height={650}
        style={{
          borderRadius: 14,
          background: "#101214",
          boxShadow: "0 0 40px rgba(0,0,0,.55)",
          cursor: "crosshair"
        }}
      />

      <button
        style={{ marginTop: 10 }}
        onClick={() => {
          setObstacles([]);
          setPins([]);
          currentPolyRef.current = [];
          saveMap([], []);
          drawScene();
        }}
      >
        Clear Map (Keep Pose)
      </button>
    </div>
  );
}
