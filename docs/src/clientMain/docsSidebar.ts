export class DocsSidebar extends HTMLElement {

	connectedCallback() {
		this.#sidebarOpen = window.innerWidth > 768;
	}

	get sidebarOpen() {
		return this.#sidebarOpen;
	}
	set sidebarOpen(value) {
		this.#sidebarOpen = value;

	}
	#sidebarOpen = true
}

if(!customElements.get('docs-sidebar')) {
	customElements.define('docs-sidebar', DocsSidebar);
}
