document
  .querySelector("#downloadButton")
  .addEventListener("click", downloadSVG);
document.querySelector("#drawButton").addEventListener("click", createHouse);


import { union } from "https://cdn.jsdelivr.net/npm/martinez-polygon-clipping/+esm";

let roomsDrawn = 0;
const ROOM_LABELS = [
  { name: "HOME THEATRE", descript: "lorem30" },
  { name: "BATHROOM", descript: "lorem30" },
  { name: "LIBRARY", descript: "lorem30" },
  { name: "SCULLERY", descript: "lorem30" },
  { name: "KITCHEN", descript: "lorem30" },
  { name: "PLAYROOM", descript: "lorem30" },
  { name: "GARDEN", descript: "lorem30" },
  { name: "LOUNGE", descript: "lorem30" },
  { name: "BEDROOM", descript: "lorem30" },
  { name: "CORRIDOR", descript: "lorem30" },
  { name: "CELLAR", descript: "lorem30" },
  { name: "BASEMENT", descript: "lorem30" },
];
const roomShapes = [
  // Square
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
];

console.log(ROOM_LABELS);

// 2. Room class
class Room {
  constructor({
    shape,
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    fill = "#ccc",
    label = "",
  }) {
    // deep copy shape
    this.shape = shape.map((p) => ({ x: p.x, y: p.y }));
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fill = fill;
    this.label = label;
    // compute bounding box for quick collision checks
    this.bbox = { x1: x, y1: y, x2: x + width, y2: y + height };
  }

  draw(svg) {
    const pts = this.shape
      .map((p) => `${p.x * this.width + this.x},${p.y * this.height + this.y}`)
      .join(" ");
    const poly = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon"
    );
    poly.setAttribute("points", pts);
    //poly.setAttribute("fill", this.fill);
    poly.setAttribute("stroke", "white");
    poly.setAttribute("stroke-width", "1");
    svg.appendChild(poly);

    if (this.label) {
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", this.x + this.width / 2);
      text.setAttribute("y", this.y + this.height / 2);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "white");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("font-family", "var(--header-font)");
      text.textContent = this.label;
      svg.appendChild(text);
    }
  }

  getEdges() {
    return [
      { x1: this.x, y1: this.y, x2: this.x + this.width, y2: this.y }, // top
      {
        x1: this.x + this.width,
        y1: this.y,
        x2: this.x + this.width,
        y2: this.y + this.height,
      }, // right
      {
        x1: this.x + this.width,
        y1: this.y + this.height,
        x2: this.x,
        y2: this.y + this.height,
      }, // bottom
      { x1: this.x, y1: this.y + this.height, x2: this.x, y2: this.y }, // left
    ];
  }
}

class RoomGraph {
  constructor() {
    this.rooms = [];
    this.openEdges = []; // Each edge = { x, y, direction, roomRef }
  }

  addRoom(room) {
    this.rooms.push(room);
    this.registerOpenEdges(room);
  }

  registerOpenEdges(room) {
    const { x, y, width, height } = room;

    this.openEdges.push(
      { x: x + width, y, direction: "right", room },
      { x: x, y: y + height, direction: "bottom", room },
      { x: x - 1, y, direction: "left", room },
      { x: x, y: y - 1, direction: "top", room }
    );
  }

  findSnapPosition(shape, width, height) {
    for (let edge of this.openEdges) {
      const pos = this.snapToEdge(edge, width, height);
      if (pos && !this.overlapsExisting(pos, width, height)) {
        return { x: pos.x, y: pos.y, direction: edge.direction };
      }
    }
    return null;
  }

  snapToEdge(edge, width, height) {
    switch (edge.direction) {
      case "right":
        return { x: edge.x, y: edge.y };
      case "left":
        return { x: edge.x - width, y: edge.y };
      case "top":
        return { x: edge.x, y: edge.y - height };
      case "bottom":
        return { x: edge.x, y: edge.y };
    }
  }

  overlapsExisting(pos, width, height) {
    const box = { x: pos.x, y: pos.y, width, height };
    return this.rooms.some(
      (r) =>
        !(
          r.x + r.width <= box.x ||
          r.x >= box.x + box.width ||
          r.y + r.height <= box.y ||
          r.y >= box.y + box.height
        )
    );
  }
}

class House {
  constructor({ svg, numRooms = 5 }) {
    this.svg = svg;
    this.numRooms = numRooms;
    this.rooms = [];
  }

  generate() {
    this.rooms = [];

    roomsDrawn = 0;

    const graph = new RoomGraph();

    // Step 1: Create the first room at origin
    const prevDirection = null;
    const firstShape = this.pickShape();
    const firstRoom = new Room({
      shape: deepCopy(firstShape),
      x: 0,
      y: 0,
      width: this.randomSize(),
      height: this.randomSize(),
      fill: this.randomColor(),
      label: ROOM_LABELS[roomsDrawn].name,
    });
    roomsDrawn += 1;
    this.rooms.push(firstRoom);
    graph.addRoom(firstRoom);

    const desiredRoomCount = 10;

    // Step 2: Add additional rooms adjacent to previous
    for (let i = 1; i < desiredRoomCount; i++) {
      const shape = this.pickShape();
      const width = this.shapeBounds(shape).width * this.randomSize();
      const height = this.shapeBounds(shape).height * this.randomSize();

      const snap = graph.findSnapPosition(shape, width, height);

      if (!snap) break;

      const newRoom = new Room({
        shape: deepCopy(shape),
        x: snap.x,
        y: snap.y,
        width,
        height,
        label: ROOM_LABELS[roomsDrawn % ROOM_LABELS.length].name,
        fill: this.randomColor(),
      });
      console.log(newRoom);
      graph.addRoom(newRoom);

      roomsDrawn += 1;

      this.rooms.push(newRoom);
    }
  }

  draw() {
    this.clearSVG();
    this.rooms.forEach((room) => room.draw(this.svg));
    this.scalePlan();
    //const walls = this.getUniqueWalls();
    //this.drawWallsSVG(walls);
  }

  scalePlan() {
    const bounds = this.houseBounds(this.rooms);
    const padding = 40;
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;
    this.svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
  }

  houseBounds() {
    if (this.rooms.length === 0) {
      return { minX: 0, minY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const room of this.rooms) {
      const x1 = room.x;
      const y1 = room.y;
      const x2 = room.x + room.width;
      const y2 = room.y + room.height;

      if (x1 < minX) minX = x1;
      if (y1 < minY) minY = y1;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    }

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  shapeBounds(shape) {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const p of shape) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    return {
      width: maxX - minX,
      height: maxY - minY,
      minX,
      minY,
      maxX,
      maxY,
    };
  }
  computeAdjacentPosition(room, direction, newSize) {
    switch (direction) {
      case "right":
        return { x: room.x + room.width, y: room.y };
      case "left":
        return { x: room.x - newSize, y: room.y };
      case "top":
        return { x: room.x, y: room.y - newSize };
      case "bottom":
        return { x: room.x, y: room.y + room.height };
    }
  }

  drawDoors() {
    for (const room of this.rooms) {
      const potentialDoors = [];

      // Check all four walls for possible door locations
      // Each side returns an array of possible door coords on that wall
      for (let dx = 1; dx < room.width - 1; dx++) {
        potentialDoors.push({
          side: "top",
          x: room.x + dx,
          y: room.y - 1,
          intoSpace: !this.isOccupied(room.x + dx, room.y - 1),
        });
        potentialDoors.push({
          side: "bottom",
          x: room.x + dx,
          y: room.y + room.height,
          intoSpace: !this.isOccupied(room.x + dx, room.y + room.height),
        });
      }

      for (let dy = 1; dy < room.height - 1; dy++) {
        potentialDoors.push({
          side: "left",
          x: room.x - 1,
          y: room.y + dy,
          intoSpace: !this.isOccupied(room.x - 1, room.y + dy),
        });
        potentialDoors.push({
          side: "right",
          x: room.x + room.width,
          y: room.y + dy,
          intoSpace: !this.isOccupied(room.x + room.width, room.y + dy),
        });
      }

      // Prioritize doors leading to unoccupied space
      const unoccupied = potentialDoors.filter((d) => d.intoSpace);
      const fallback = potentialDoors.filter((d) => !d.intoSpace);

      // Choose 1 or 2 door locations
      const numDoors = Math.random() < 0.25 ? 2 : 1;
      const choices = unoccupied.length > 0 ? unoccupied : fallback;

      const selected = [];
      while (selected.length < numDoors && choices.length > 0) {
        const idx = Math.floor(Math.random() * choices.length);
        selected.push(choices.splice(idx, 1)[0]);
      }

      room.doors = selected;
    }
  }
  // Utility to check if a grid space is occupied
  isOccupied(x, y) {
    return this.rooms.some(
      (r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
    );
  }

  directionOffset(direction, room) {
    switch (direction) {
      case "right":
        return { x: room.x + room.width, y: room.y };
      case "left":
        return { x: room.x - room.width, y: room.y };
      case "top":
        return { x: room.x, y: room.y - room.height };
      case "bottom":
        return { x: room.x, y: room.y + room.height };
    }
  }

  roomsOverlap(a, b, buffer = 0.1) {
    return !(
      a.x + a.width <= b.x + buffer ||
      a.x >= b.x + b.width - buffer ||
      a.y + a.height <= b.y + buffer ||
      a.y >= b.y + b.height - buffer
    );
  }

  pickShape() {
    return roomShapes[Math.floor(Math.random() * roomShapes.length)];
  }

  randomSize() {
    return 100 + Math.floor(Math.random() * 3) * 25; // between 50–100
  }

  randomColor() {
    const palette = ["#fce4ec", "#e0f7fa", "#fff3e0", "#ede7f6", "#f3e5f5"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  clearSVG() {
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
  }

  getRoomEdges(room) {
    const x = room.x;
    const y = room.y;
    const w = room.width;
    const h = room.height;

    return [
      { from: { x: x, y: y }, to: { x: x + w, y: y }, dir: "top" },
      { from: { x: x + w, y: y }, to: { x: x + w, y: y + h }, dir: "right" },
      { from: { x: x + w, y: y + h }, to: { x: x, y: y + h }, dir: "bottom" },
      { from: { x: x, y: y + h }, to: { x: x, y: y }, dir: "left" },
    ];
  }

  getUniqueWalls() {
    const wallMap = new Map();

    function edgeKey(edge) {
      const { from, to } = edge;
      return `${from.x},${from.y}->${to.x},${to.y}`;
    }

    function reverseEdgeKey(edge) {
      const { from, to } = edge;
      return `${to.x},${to.y}->${from.x},${from.y}`;
    }

    for (const room of this.rooms) {
      const edges = this.getRoomEdges(room);
      for (const edge of edges) {
        const key = edgeKey(edge);
        const revKey = reverseEdgeKey(edge);

        if (wallMap.has(revKey)) {
          wallMap.delete(revKey); // shared wall: remove it
        } else {
          wallMap.set(key, edge);
        }
      }
    }

    return Array.from(wallMap.values());
  }

  pathFromPolygon(poly) {
    return (
      poly.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ") +
      " Z"
    );
  }

 offsetPolygon(polygon, delta) {
    const offset = new Offset();
    const result = offset.data([polygon]).offset(delta);
  
    // Return the first polygon in case multiple are returned
    return result[0];
  }
  drawWallsSVG(walls) {
    const roomPolygons = this.rooms.map((room) => [
      [
        [room.x, room.y],
        [room.x + room.width, room.y],
        [room.x + room.width, room.y + room.height],
        [room.x, room.y + room.height],
        [room.x, room.y],
      ],
    ]);
    const unionAll = (polygons) =>
      polygons.reduce((acc, poly) => union(acc, poly));

    const unioned = unionAll(roomPolygons); // returns MultiPolygon or Polygon
    const outerPath = this.pathFromPolygon(this.offsetPolygon(unioned[0], 2.5));
    const innerPath = this.pathFromPolygon(
      this.offsetPolygon(unioned[0], -2.5)
    );

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `${outerPath} ${innerPath}`);
    path.setAttribute("fill", "black");
    path.setAttribute("fill-rule", "evenodd");
    svg.appendChild(path);

    for (const edge of walls) {
      const { from, to } = edge;
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", from.x);
      line.setAttribute("y1", from.y);
      line.setAttribute("x2", to.x);
      line.setAttribute("y2", to.y);
      line.setAttribute("stroke", "white");
      line.setAttribute("stroke-width", 5);
      this.svg.appendChild(line);
    }
  }
}

function deepCopy(shape) {
  const newShape = shape.map((p) => ({ x: p.x, y: p.y }));
  return newShape;
}

function createHouse() {
  const house = new House({
    svg: document.querySelector("#houseplan"),
    numRooms: 7,
  });

  house.generate();
  house.draw();
}

function getInput() {
  //Get the textarea element by its ID
  const textarea = document.getElementById("prompt");

  const textareaValue = textarea.value;
  //const params = analyzeTextToSpiroParams(textareaValue);
  return textareaValue;
}

function downloadSVG() {
  console.log("Downloading SVG...");
  const svg = document.getElementById("houseplan");
  const serializer = new XMLSerializer();

  // Clone to avoid altering DOM
  const clone = svg.cloneNode(true);

  // Inject metadata
  const metadata = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "metadata"
  );
  metadata.textContent = `
      Spiroquad v1.0 — A generative spirograph crafted from poetic inputs.
      https://jupiterbyrd.github.io/spiroquad
      Easter Egg: The spirograph hears your words.`;
  clone.insertBefore(metadata, clone.firstChild);

  // Serialize
  let source = serializer.serializeToString(clone);
  if (!source.match(/^<\?xml/)) {
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
  }

  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const text = getInput();
  let filename = "";
  for (let index = 0; index < 16; index++) {
    filename += text.charAt(Math.floor(Math.random() * text.length));
  }
  a.download = filename.toUpperCase() + ".svg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
