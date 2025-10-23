const __vite__mapDeps = (i, m = __vite__mapDeps, d = (m.f || (m.f = ["assets/dynamic-DvtG7N5B.js", "assets/dynamic-g7pxOomj.css"]))) => i.map(i => d[i]);
const p = "modulepreload", v = function (i) {return "/" + i}, d = {}, E = function (f, c, P) {
	let l = Promise.resolve();
	if (c && c.length > 0) {
		let u = function (e) {
			return Promise.all(e.map(o => Promise.resolve(o).then(s => ({
				status: "fulfilled",
				value: s
			}), s => ({status: "rejected", reason: s}))))
		};
		var y = u;
		document.getElementsByTagName("link");
		const r = document.querySelector("meta[property=csp-nonce]"), t = r?.nonce || r?.getAttribute("nonce");
		l = u(c.map(e => {
			if (e = v(e), e in d) return;
			d[e] = !0;
			const o = e.endsWith(".css"), s = o ? '[rel="stylesheet"]' : "";
			if (document.querySelector(`link[href="${e}"]${s}`)) return;
			const n = document.createElement("link");
			if (n.rel = o ? "stylesheet" : p, o || (n.as = "script"), n.crossOrigin = "", n.href = e, t && n.setAttribute("nonce", t), document.head.appendChild(n), o) return new Promise((m, h) => {n.addEventListener("load", m), n.addEventListener("error", () => h(new Error(`Unable to preload CSS for ${e}`)))})
		}))
	}

	function a(r) {
		const t = new Event("vite:preloadError", {cancelable: !0});
		if (t.payload = r, window.dispatchEvent(t), !t.defaultPrevented) throw r
	}

	return l.then(r => {
		for (const t of r || []) t.status === "rejected" && a(t.reason);
		return f().catch(a)
	})
};
console.log("Hello from clientMain :)");
E(() => import("./dynamic-DvtG7N5B.js"), __vite__mapDeps([0, 1]));
