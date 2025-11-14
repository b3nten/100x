import "./assets/styles.css"
import "nes.css/css/nes.min.css";
import "./docsSidebar"

import { fragments } from "./webgl/fragments.js";

fragments(document.getElementById("viewport") ?? (() => { throw Error("Viewport not found") })());

// uncloak
document.body.style.opacity = "1"
