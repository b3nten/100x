import "./assets/styles.css"

if(location.pathname === "/") {
	import("./webgl/fragments.js")
		.then(mod => mod.fragments(document.getElementById("viewport")));
}
