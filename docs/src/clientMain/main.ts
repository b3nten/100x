import "./assets/styles.css"
import "./components/floating-badge"
import "./components/scroll-progress"

if(location.pathname === "/") {
	import("./webgl/fragments.js")
		.then(mod => mod.fragments(document.getElementById("viewport")));
}
