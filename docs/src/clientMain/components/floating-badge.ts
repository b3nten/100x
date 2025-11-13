export class FloatingBadge extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		const icon = this.getAttribute('icon') || '⚡';
		let src = this.getAttribute('src');
		const color = this.getAttribute('color') || '#fbbf24';
		const delay = this.getAttribute('delay') || '0s';

		if (this.shadowRoot) {
			const content = src
				? `<img src="${src}" alt="badge" style="width: 16px; height: 16px; object-fit: contain;" />`
				: `<span style="color: ${color};">${icon}</span>`;

			this.shadowRoot.innerHTML = `
				<style>
					:host {
						display: inline-block;
					}
					.badge {
						display: inline-flex;
						align-items: center;
						justify-content: center;
						width: 16px;
						height: 16px;
						font-size: 12px;
						animation: float 2s ease-in-out infinite;
						animation-delay: ${delay};
						filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
					}
					@keyframes float {
						0%, 100% {
							transform: translateY(0px);
						}
						50% {
							transform: translateY(-6px);
						}
					}
				</style>
				<div class="badge">
					${content}
				</div>
			`;
		}
	}
}

customElements.define('floating-badge', FloatingBadge);
