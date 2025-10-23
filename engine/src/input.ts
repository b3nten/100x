import { createEvent, EventManager } from "./events.ts";

//  ██████╗ ██████╗ ██████╗ ███████╗███████╗
// ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝
// ██║     ██║   ██║██║  ██║█████╗  ███████╗
// ██║     ██║   ██║██║  ██║██╔══╝  ╚════██║
// ╚██████╗╚██████╔╝██████╔╝███████╗███████║
//  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝

/**
 * Enum for key codes, corresponding to the MouseEvent.button property.
 */
export enum MouseCode {
	/**
	 * key code of mouse left
	 */
	MouseLeft = 0,

	/**
	 * key code of mouse middle
	 */
	MouseMiddle = 1,

	/**
	 * key code of mouse right
	 */
	MouseRight = 2,

	/**
	 * key code of mouse four (back)
	 */
	MouseFour = 3,

	/**
	 * key code of mouse five (forward)
	 */
	MouseFive = 4,
}

/**
 * Enum for key codes, corresponding to the KeyboardEvent.code property.
 */
export enum KeyCode {
	None = "KEY_NONE",

	A = "KeyA",
	B = "KeyB",
	C = "KeyC",
	D = "KeyD",
	E = "KeyE",
	F = "KeyF",
	G = "KeyG",
	H = "KeyH",
	I = "KeyI",
	J = "KeyJ",
	K = "KeyK",
	L = "KeyL",
	M = "KeyM",
	N = "KeyN",
	O = "KeyO",
	P = "KeyP",
	Q = "KeyQ",
	R = "KeyR",
	S = "KeyS",
	T = "KeyT",
	U = "KeyU",
	V = "KeyV",
	W = "KeyW",
	X = "KeyX",
	Y = "KeyY",
	Z = "KeyZ",

	One = "Digit1",
	Two = "Digit2",
	Three = "Digit3",
	Four = "Digit4",
	Five = "Digit5",
	Six = "Digit6",
	Seven = "Digit7",
	Eight = "Digit8",
	Nine = "Digit9",
	Zero = "Digit0",

	Minus = "Minus",
	Equal = "Equal",
	BracketLeft = "BracketLeft",
	BracketRight = "BracketRight",
	Backslash = "Backslash",
	Semicolon = "Semicolon",
	Quote = "Quote",
	Comma = "Comma",
	Period = "Period",
	Slash = "Slash",
	Backspace = "Backspace",
	Space = "Space",
	ControlLeft = "ControlLeft",
	MetaLeft = "MetaLeft",
	AltLeft = "AltLeft",
	ShiftLeft = "ShiftLeft",
	CapsLock = "CapsLock",
	Tab = "Tab",
	Esc = "Escape",
	Enter = "Enter",
	ControlRight = "ControlRight",
	MetaRight = "MetaRight",
	AltRight = "AltRight",
	ShiftRight = "ShiftRight",
	ContextMenu = "ContextMenu",
	Insert = "Insert",
	Delete = "Delete",
	Home = "Home",
	End = "End",
	PageUp = "PageUp",
	PageDown = "PageDown",
	NumLock = "NumLock",
	Clear = "Clear",

	ArrowUp = "ArrowUp",
	ArrowDown = "ArrowDown",
	ArrowLeft = "ArrowLeft",
	ArrowRight = "ArrowRight",
	PrintScreen = "PrintScreen",
}

// ███████╗██╗   ██╗███████╗███╗   ██╗████████╗███████╗
// ██╔════╝██║   ██║██╔════╝████╗  ██║╚══██╔══╝██╔════╝
// █████╗  ██║   ██║█████╗  ██╔██╗ ██║   ██║   ███████╗
// ██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║   ██║   ╚════██║
// ███████╗ ╚████╔╝ ███████╗██║ ╚████║   ██║   ███████║
// ╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

export interface KeyboardKeyEvent
	extends Pick<
		KeyboardEvent,
		| "code"
		| "repeat"
		| "shiftKey"
		| "ctrlKey"
		| "altKey"
		| "metaKey"
		| "timeStamp"
	> {
	down: boolean;
	spaceKey: boolean;
}

export interface KeyboardKeyPressedEvent
	extends Pick<
		KeyboardEvent,
		"code" | "shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "timeStamp"
	> {
	spaceKey: boolean;
}

export interface MouseButtonEvent
	extends Pick<
		MouseEvent,
		"shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "timeStamp" | "x" | "y"
	> {
	button: MouseCode;
	down: boolean;
	spaceKey: boolean;
}

export interface MouseMoveEvent
	extends Pick<
		MouseEvent,
		"shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "timeStamp" | "x" | "y"
	> {
	spaceKey: boolean;
	deltaX: number;
	deltaY: number;
	movementX: number;
	movementY: number;
}

export const KeyDownEvent = createEvent<KeyboardKeyEvent>("KeyDownEvent");
export const KeyUpEvent = createEvent<KeyboardKeyEvent>("KeyUpEvent");
export const KeyPressedEvent =
	createEvent<KeyboardKeyPressedEvent>("KeyPressedEvent");
export const MouseMoveEvent = createEvent<MouseMoveEvent>("MouseUpEvent");
export const MouseDownEvent = createEvent<MouseButtonEvent>("MouseDownEvent");
export const MouseUpEvent = createEvent<MouseButtonEvent>("MouseUpEvent");

// ██╗███╗   ██╗██████╗ ██╗   ██╗████████╗
// ██║████╗  ██║██╔══██╗██║   ██║╚══██╔══╝
// ██║██╔██╗ ██║██████╔╝██║   ██║   ██║
// ██║██║╚██╗██║██╔═══╝ ██║   ██║   ██║
// ██║██║ ╚████║██║     ╚██████╔╝   ██║
// ╚═╝╚═╝  ╚═══╝╚═╝      ╚═════╝    ╚═╝

export class Input {
	static {
		if (false) {
			// todo: handle case in worker
		} else {
			// mouse move
			window.addEventListener("mousemove", (event: any) => {
				Input.mouseDeltaX = Input.mouseX - event.clientX;
				Input.mouseDeltaY = Input.mouseY - event.clientY;
				Input.mouseX = event.clientX;
				Input.mouseY = event.clientY;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				event.acceleration = mouseVector;
				event.deltaX = Input.mouseDeltaX;
				event.deltaY = Input.mouseDeltaY;
				Input.bus.notify(MouseMoveEvent, event);
			});
			// mouse down
			window.addEventListener("mousedown", (event: any) => {
				Input.mousesDown.add(event.button);
				event.down = true;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.bus.notify(MouseDownEvent, event);
			});
			// mouse up
			window.addEventListener("mouseup", (event: any) => {
				Input.mousesDown.delete(event.button);
				event.down = false;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.bus.notify(MouseUpEvent, event);
			});
			// key down
			window.addEventListener("keydown", (event: any) => {
				Input.keysDown.add(<KeyCode>event.code);
				event.down = true;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.bus.notify(KeyDownEvent, event);
			});
			// key up
			window.addEventListener("keyup", (event: any) => {
				Input.keysDown.delete(<KeyCode>event.code);
				event.down = false;
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.bus.notify(KeyUpEvent, event);
			});
			// key pressed
			window.addEventListener("keypress", (event: any) => {
				event.spaceKey = Input.keyDown(KeyCode.Space);
				Input.bus.notify(KeyPressedEvent, event);
			});
		}
	}

	/** Mouse position in X (horizontal) direction */
	static mouseX = 0;

	get mouseX() {
		return Input.mouseX;
	}

	/** Mouse position in Y (vertical) direction */
	static mouseY = 0;

	get mouseY() {
		return Input.mouseY;
	}

	static mouseDeltaX = 0;

	get mouseDeltaX() {
		return Input.mouseDeltaX;
	}

	static mouseDeltaY = 0;

	get mouseDeltaY() {
		return Input.mouseDeltaY;
	}

	/** Get whether a mouse button is currently pressed */
	static mouseDown(button: MouseCode): boolean {
		return Input.mousesDown.has(button);
	}

	mouseDown(button: MouseCode): boolean {
		return Input.mouseDown(button);
	}

	/** Get whether a key is currently pressed */
	static keyDown(keyCode: KeyCode): boolean {
		return Input.keysDown.has(keyCode);
	}

	keyDown(keyCode: KeyCode): boolean {
		return Input.keyDown(keyCode);
	}

	static bus = new EventManager();
	static on = this.bus.register;
	static off = this.bus.unregister;

	protected static keysDown = new Set<KeyCode>();
	protected static mousesDown = new Set<MouseCode>();
	protected onKeyDownCallbacks: Map<KeyCode, Function> = new Map();
}

let mouseVector = { x: 0, y: 0 };
