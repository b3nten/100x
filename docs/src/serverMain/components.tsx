export function NavBar(props: { githubUrl?: string }) {
	const githubUrl = props.githubUrl || "https://github.com/b3nten/100x";

	return (
		<nav class="fixed flex! items-center! justify-between! px-4 py-3 md:px-8 top-2 z-50 nes-container is-dark is-rounded">
				<a href="/" class="glitch-hover nes-text is-primary text-lg md:text-xl">
					100X
				</a>
				<div class="flex gap-4 md:gap-8 items-center retro-font text-xs md:text-sm">
					<a
						type="button"
						class="nes-btn is-neutral glitch-hover"
						href="/docs/intro"
					>
						docs
					</a>
					<a
						href={githubUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors px-2 py-1 hover:animate-bounce"
					>
						<i class="nes-icon github"></i>
					</a>
				</div>
		</nav>
	);
}

interface SidebarLinkProps {
	href: string;
	label: string;
	active?: boolean;
}

function SidebarLink(props: SidebarLinkProps) {
	return (
		<a
			href={props.href}
			class={`block px-4 py-1 nes-text text-white! text-xs`}
		>
			{props.label}
		</a>
	);
}

interface SidebarSectionProps {
	title: string;
	links: Array<{ href: string; label: string; active?: boolean }>;
}

function SidebarSection(props: SidebarSectionProps) {
	return (
		<div class="mb-6">
			<h3 class="px-4 py-2 text-sm nes-text is-warning uppercase">
				{props.title}
			</h3>
			<div class="space-y-1">
				{props.links.map(link => (
					<SidebarLink {...link} />
				))}
			</div>
		</div>
	);
}

export function Sidebar(props: { currentPath?: string }) {
	const sections = [
		{
			title: "Getting Started",
			links: [
				{ href: "/docs/intro", label: "Introduction", active: props.currentPath === "/docs/intro" }
			]
		},
		{
			title: "Packages",
			links: [
				{ href: "/docs/engine", label: "Engine", active: props.currentPath?.startsWith("/docs/engine") },
				{ href: "/docs/framework", label: "Framework", active: props.currentPath?.startsWith("/docs/framework") },
				{ href: "/docs/router", label: "Router", active: props.currentPath?.startsWith("/docs/router") },
				{ href: "/docs/react", label: "React", active: props.currentPath?.startsWith("/docs/react") }
			]
		}
	];

	return (
		<docs-sidebar>
			<aside class="fixed left-0 top-32 bottom-8 w-72">
				<div class="py-6 nes-container is-rounded is-dark h-full">
					{sections.map(section => (
						<SidebarSection {...section} />
					))}
				</div>
			</aside>
		</docs-sidebar>
	);
}
