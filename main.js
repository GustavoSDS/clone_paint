const MODES = {
	DRAW: "draw",
	ERASE: "erase",
	RECTANGLE: "rectangle",
	ELLIPSE: "ellipse",
	PICKER: "picker",
	ERASE_SELECTION: "eraseSelection",
};

// Utils
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// DOM
const $canvas = $("#canvas");
const $colorPicker = $("#color-picker");
const $btnClear = $("#btn-clear");
const $btnDraw = $("#btn-draw");
const $btnRectangle = $("#btn-rectangle");
const $btnErase = $("#btn-erase");
const $btnPicker = $("#btn-picker");
const $btnEllipse = $("#btn-ellipse");
const $btnEraseSelection = $("#btn-eraseSelection");
const $btnUndo = $("#btn-undo");

const ctx = $canvas.getContext("2d", { willReadFrequently: true });
$canvas.style.cursor = "crosshair";

// State
let isDrawing = false;
let startX, startY;
let lastX = 0;
let lastY = 0;
let mode;
let brushSize = 2;
let color = "#2e8cf7";
let snapshotCanvas;
let snapshotsCanvas = [];

// INIT
setMode(MODES.DRAW);

// Events
$canvas.addEventListener("mousedown", startDrawing);
$canvas.addEventListener("mousemove", draw);
$canvas.addEventListener("mouseup", stopDrawing);
$canvas.addEventListener("mouseleave", stopDrawing);

$colorPicker.addEventListener("change", handleChangeColor);

$btnClear.addEventListener("click", clearCanvas);
$btnDraw.addEventListener("click", setMode.bind(null, MODES.DRAW));
$btnEllipse.addEventListener("click", setMode.bind(null, MODES.ELLIPSE));
$btnRectangle.addEventListener("click", setMode.bind(null, MODES.RECTANGLE));
$btnErase.addEventListener("click", setMode.bind(null, MODES.ERASE));
$btnPicker.addEventListener("click", setMode.bind(null, MODES.PICKER));
$btnEraseSelection.addEventListener(
	"click",
	setMode.bind(null, MODES.ERASE_SELECTION)
);
$btnUndo.addEventListener("click", modeUndo);

// Methods
function clearCanvas() {
	ctx.clearRect(0, 0, $canvas.width, $canvas.height);
}

function handleChangeColor(e) {
	color = e.target.value;
}

function startDrawing(e) {
	isDrawing = true;

	[startX, startY] = [e.offsetX, e.offsetY];
	[lastX, lastY] = [e.offsetX, e.offsetY];

	snapshotCanvas = ctx.getImageData(0, 0, $canvas.width, $canvas.height); // guardar estado del canvas
	snapshotsCanvas.push(snapshotCanvas);
}

function draw(e) {
	if (!isDrawing) return;
	ctx.strokeStyle = color;
	ctx.lineWidth = brushSize;
	const width = Math.abs(e.offsetX - startX);
	const height = Math.abs(e.offsetY - startY);
	const x = Math.min(startX, e.offsetX);
	const y = Math.min(startY, e.offsetY);

	if (mode === MODES.DRAW) {
		modeDraw(e);
		return;
	}
	if (mode === MODES.RECTANGLE) {
		ctx.putImageData(snapshotCanvas, 0, 0);
		ctx.beginPath(); // empezar trazado
		ctx.rect(x, y, width, height); // dibujar el trazo
		ctx.stroke();
		return;
	}
	if (mode === MODES.ERASE_SELECTION) {
		modeEraseBySelection({ x, y, width, height });
		return;
	}
}

function stopDrawing() {
	isDrawing = false;
}

function setMode(newMode) {
	mode = newMode;
	$("button.active")?.classList.remove("active");
	$("#btn-" + newMode).classList.add("active");

	if (mode === MODES.DRAW) {
		$canvas.style.cursor = "crosshair";
		return;
	}
	if (mode === MODES.RECTANGLE) {
		$canvas.style.cursor = "nw-resize";
		return;
	}
}

// Drawing methods
function modeDraw(e) {
	ctx.beginPath(); // empezar trazado
	ctx.moveTo(lastX, lastY); // mover el trazo hasta el punto actual
	ctx.lineTo(e.offsetX, e.offsetY); // dibujar el trazo entre el punto actual y el punto nuevo
	ctx.stroke(); // dibujar el trazo

	[lastX, lastY] = [e.offsetX, e.offsetY]; // actualizar las coordenadas del punto actual
}

function modeEraseBySelection({ x, y, width, height }) {
	ctx.beginPath();
	ctx.rect(x, y, width, height);
	ctx.stroke();
	ctx.putImageData(snapshotCanvas, 0, 0);
	ctx.clearRect(x, y, width, height);
}

function modeUndo() {
	if (snapshotsCanvas.length === 0) return;
	snapshotsCanvas.pop();
	ctx.clearRect(0, 0, $canvas.width, $canvas.height);

	// Si todavía hay snapshots, re-aplicar el último snapshot restante
	if (snapshotsCanvas.length > 0) {
		const lastSnapshot = snapshotsCanvas[snapshotsCanvas.length - 1];
		ctx.putImageData(lastSnapshot, 0, 0); // Reaplicar en la coordenada (0, 0)
	}
}
