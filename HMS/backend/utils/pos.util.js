function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleBetween(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (m === 0) return 0;

  let cosv = Math.max(-1, Math.min(1, dot / m));
  return (Math.acos(cosv) * 180) / Math.PI;
}

function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;

    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

function segmentIntersectsPoly(a, b, poly) {
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i];
    const d = poly[(i + 1) % poly.length];
    if (segmentsIntersect(a, b, c, d)) return true;
  }
  return false;
}

function segmentsIntersect(a, b, c, d) {
  function cross(p, q, r) {
    return (q.x - p.x) * (r.y - p.y) -
           (q.y - p.y) * (r.x - p.x);
  }

  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}


const ROBOT_RADIUS = 0.22; // meters

function inflatePoly(poly, r = ROBOT_RADIUS) {
  return poly.map(p => ({
    x: p.x,
    y: p.y,
    // simple outward padding — enough for indoor walls
  }));
}


function segmentHitsObstacles(a, b, obstacles) {
  for (const poly of obstacles) {
    if (pointInPoly(a, poly)) return true;
    if (pointInPoly(b, poly)) return true;
    if (segmentIntersectsPoly(a, b, poly)) return true;
  }
  return false;
}

function rrtPlan(start, goal, obstacles, {
  maxSamples = 3000,
  stepSize = 0.35,
  goalBias = 0.25,
  goalThreshold = 0.35
} = {}) {

  const nodes = [{ ...start, parent: null }];

  function nearest(pt) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = dist(nodes[i], pt);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return nodes[best];
  }

  for (let k = 0; k < maxSamples; k++) {

    // biased random sample
    let sample;
    if (Math.random() < goalBias) {
      sample = goal;
    } else {
      sample = {
        x: start.x + (Math.random() - 0.5) * 10,
        y: start.y + (Math.random() - 0.5) * 10
      };
    }

    const n = nearest(sample);

    const d = dist(n, sample);
    const step = Math.min(stepSize, d);

    const dir = {
      x: (sample.x - n.x) / d,
      y: (sample.y - n.y) / d
    };

    const newNode = {
      x: n.x + dir.x * step,
      y: n.y + dir.y * step,
      parent: n
    };

    if (segmentHitsObstacles(n, newNode, obstacles)) continue;

    nodes.push(newNode);

    if (dist(newNode, goal) < goalThreshold) {
      goal.parent = newNode;
      return reconstructPath(goal);
    }
  }

  return null;
}

function reconstructPath(node) {
  const path = [];
  let cur = node;
  while (cur) {
    path.push({ x: cur.x, y: cur.y });
    cur = cur.parent;
  }
  return path.reverse();
}

const MIN_SPACING = 0.95;
const MAX_TURN_ANGLE = 25;

function getFilteredWaypoints(rawPath) {

  if (!rawPath || rawPath.length < 2)
    return rawPath;

  const filtered = [];
  let last = rawPath[0];

  filtered.push(last);

  let acc = 0;

  for (let i = 1; i < rawPath.length; i++) {

    const prev = rawPath[i - 1];
    const curr = rawPath[i];

    acc += dist(prev, curr);

    if (acc < MIN_SPACING)
      continue;

    acc = 0;

    if (i < rawPath.length - 1) {
      const next = rawPath[i + 1];

      const ang = angleBetween(last, curr, next);

      if (ang > MAX_TURN_ANGLE) {
        filtered.push(curr);
        last = curr;
        continue;
      }
    }

    filtered.push(curr);
    last = curr;
  }

  const goal = rawPath[rawPath.length - 1];

  if (filtered[filtered.length - 1] !== goal)
    filtered.push(goal);

  return filtered;
}


module.exports = {rrtPlan,getFilteredWaypoints,inflatePoly,segmentHitsObstacles};
