export class ScrollProgress extends HTMLElement {
	private progressBar: HTMLDivElement | null = null;

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		if (this.shadowRoot) {
			this.shadowRoot.innerHTML = `
				<style>
					:host {
						display: block;
						position: fixed;
						top: 57px;
						left: 0;
						right: 0;
						height: 4px;
						background: rgba(255, 255, 255, 0.1);
						z-index: 100;
					}
					.progress-bar {
						height: 100%;
						background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
						width: 0%;
						transition: width 0.1s ease;
						box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
						position: relative;
					}
					.progress-bar::after {
						content: '';
						position: absolute;
						right: 0;
						top: 0;
						bottom: 0;
						width: 4px;
						background: white;
						box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
					}
				</style>
				<div class="progress-bar"></div>
			`;

			this.progressBar = this.shadowRoot.querySelector('.progress-bar');
			this.updateProgress();
			window.addEventListener('scroll', () => this.updateProgress());
			window.addEventListener('resize', () => this.updateProgress());
		}
	}

	disconnectedCallback() {
		window.removeEventListener('scroll', () => this.updateProgress());
		window.removeEventListener('resize', () => this.updateProgress());
	}

	private updateProgress() {
		if (!this.progressBar) return;

		const windowHeight = window.innerHeight;
		const documentHeight = document.documentElement.scrollHeight;
		const scrollTop = window.scrollY;
		const scrollableHeight = documentHeight - windowHeight;
		const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;

		this.progressBar.style.width = `${Math.min(progress, 100)}%`;
	}
}

customElements.define('scroll-progress', ScrollProgress);
