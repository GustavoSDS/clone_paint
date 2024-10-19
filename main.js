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
ctx.lineCap = "round";
ctx.lineJoin = "round";

// State
let isDrawing = false;
let isShiftPressed = false;
let startX, startY;
let lastX = 0;
let lastY = 0;
let mode;
let brushSize = 2;
let color = "#2e8cf7";
let snapshotCanvas;
let snapshotsCanvas = [];

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

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

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

	if (mode === MODES.DRAW || mode === MODES.ERASE) {
		modeDraw(e);
		return;
	}
	if (mode === MODES.RECTANGLE) {
		modeDrawRectangle(e);
		return;
	}
	if (mode === MODES.ERASE_SELECTION) {
		modeEraseBySelection(e);
		return;
	}
	if (mode === MODES.ELLIPSE) {
		modeDrawEllipse(e);
		return;
	}
}

function stopDrawing() {
	isDrawing = false;
}

async function setMode(newMode) {
	let previousMode = mode;
	mode = newMode;
	$("button.active")?.classList.remove("active");
	$("#btn-" + newMode).classList.add("active");

	if (mode === MODES.DRAW) {
		$canvas.style.cursor = 'url("./images/cursors/pencil.cur"), auto';
		ctx.globalCompositeOperation = "source-over";
		brushSize = 2;
		return;
	}
	if (mode === MODES.RECTANGLE) {
		$canvas.style.cursor = "url('./images/cursors/rectangle.cur'), auto";
		ctx.globalCompositeOperation = "source-over";
		brushSize = 2;
		return;
	}
	if (mode === MODES.ERASE) {
		$canvas.style.cursor = "url('./images/cursors/eraser.cur'), auto";
		ctx.globalCompositeOperation = "destination-out";
		brushSize = 20;
		return;
	}
	if (mode === MODES.PICKER) {
		$canvas.style.cursor = "url('./images/cursors/picker.cur'), auto";
		const eyeDropper = new window.EyeDropper();

		try {
			const eyeDropperColor = await eyeDropper.open();
			color = eyeDropperColor.sRGBHex;
			$colorPicker.value = color;
			setMode(previousMode);
		} catch (error) {
			console.error(error);
		}

		return;
	}
	if (mode === MODES.ELLIPSE) {
		$canvas.style.cursor = "url('./images/cursors/ellipse.cur'), auto";
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

function modeEraseBySelection(event) {
	const { offsetX, offsetY } = event;
	const x = Math.min(startX, offsetX);
	const y = Math.min(startY, offsetY);
	const width = Math.abs(offsetX - startX);
	const height = Math.abs(offsetY - startY);
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

function modeDrawEllipse(e) {
	ctx.putImageData(snapshotCanvas, 0, 0);
	const { offsetX, offsetY } = e;
	const x = Math.min(startX, offsetX);
	const y = Math.min(startY, offsetY);
	
    let width = Math.abs(offsetX - startX);
	let height = Math.abs(offsetY - startY);
    if (isShiftPressed) {
        const sideLength = (Math.abs(width), Math.abs(height));
        width = width > 0 ? sideLength : -sideLength;
        height = height > 0 ? sideLength : -sideLength;
    }

	ctx.beginPath();
	ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
	ctx.stroke();
}

function modeDrawRectangle(e) {
	ctx.putImageData(snapshotCanvas, 0, 0);
	let width = e.offsetX - startX;
	let height = e.offsetY - startY;

	if (isShiftPressed) {
		const sideLength = (Math.abs(width), Math.abs(height));
		width = width > 0 ? sideLength : -sideLength;
		height = height > 0 ? sideLength : -sideLength;
	}
	ctx.beginPath();
	ctx.rect(startX, startY, width, height); // dibujar el trazo
	ctx.stroke();
}

function handleKeyDown(e) {
	isShiftPressed = e.shiftKey;
	if (e.key === "z" && e.ctrlKey) {
		modeUndo();
	}
}

function handleKeyUp(e) {
	if (e.key === "Shift") isShiftPressed = false;
}

// INIT
setMode(MODES.DRAW);

if (typeof EyeDropper !== "undefined") {
	$btnPicker.removeAttribute("disabled");
}
