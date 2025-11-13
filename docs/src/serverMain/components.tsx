import type { PropsWithChildren } from "hono/jsx";
import goldCoin from "../clientMain/assets/gold_coin.svg"

export function NavBar(props: { githubUrl?: string }) {
	const githubUrl = props.githubUrl || "https://github.com/b3nten/100x";

	return (
		<nav class="fixed top-0 left-0 right-0 z-50 bg-black text-white border-b-2 border-gray-700">
			<div class="flex items-center justify-between px-4 py-3 md:px-8">
				<a href="/" class="glitch-hover retro-font text-lg md:text-xl hover:text-yellow-300 transition-colors">
					100X
				</a>

				<div class="flex gap-4 md:gap-8 items-center retro-font text-xs md:text-sm">
					<a href="/docs/intro" class="glitch-hover hover:text-yellow-300 transition-colors px-2 py-1">
						DOCS
					</a>
					<a
						href={githubUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="glitch-hover hover:text-yellow-300 transition-colors px-2 py-1"
					>
						GITHUB
					</a>
				</div>
			</div>
		</nav>
	);
}

interface SidebarLinkProps {
	href: string;
	label: string;
	active?: boolean;
	icon?: string;
	iconColor?: string;
	iconSrc?: string;
}

function SidebarLink(props: SidebarLinkProps) {
	return (
		<a
			href={props.href}
			class={`block px-4 py-2 retro-font text-xs hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2 ${
				props.active ? 'bg-blue-600 text-white' : 'text-gray-300'
			}`}
		>
			{(props.icon || props.iconSrc) && (
				<floating-badge
					icon={props.icon}
					color={props.iconColor}
					src={props.iconSrc}
					delay="0s"
				/>
			)}
			<span>{props.label}</span>
		</a>
	);
}

interface SidebarSectionProps {
	title: string;
	links: Array<{ href: string; label: string; active?: boolean; icon?: string; iconColor?: string; iconSrc?: string }>;
}

function SidebarSection(props: SidebarSectionProps) {
	return (
		<div class="mb-6">
			<h3 class="px-4 py-2 retro-font text-sm text-yellow-300 uppercase">
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
				{ href: "/docs/intro", label: "Introduction", active: props.currentPath === "/docs/intro", iconSrc: goldCoin }
			]
		},
		{
			title: "Packages",
			links: [
				{ href: "/docs/engine", label: "Engine", active: props.currentPath?.startsWith("/docs/engine"), iconSrc: goldCoin },
				{ href: "/docs/framework", label: "Framework", active: props.currentPath?.startsWith("/docs/framework"), iconSrc: goldCoin },
				{ href: "/docs/router", label: "Router", active: props.currentPath?.startsWith("/docs/router"), iconSrc: goldCoin },
				{ href: "/docs/react", label: "React", active: props.currentPath?.startsWith("/docs/react"), iconSrc: goldCoin }
			]
		}
	];

	return (
		<aside class="fixed left-0 top-[57px] bottom-0 w-64 bg-gray-900 text-white overflow-y-auto border-r-2 border-gray-700">
			<div class="py-6">
				{sections.map(section => (
					<SidebarSection {...section} />
				))}
			</div>
		</aside>
	);
}

export function Hero(props: PropsWithChildren) {
	return (
		<div class="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
			<div class="text-center space-y-6 pointer-events-auto">
				{props.children}
			</div>
		</div>
	);
}

export function PixelButton(props: PropsWithChildren<{ href?: string; onClick?: () => void; variant?: 'default' | 'home' }>) {
	const variant = props.variant || 'default';

	const baseClasses = "retro-font text-sm px-6 py-3 text-white border-2 border-white transition-colors inline-block button-press";
	const variantClasses = variant === 'home'
		? "bg-cyan-600 hover:bg-cyan-500 nes-shadow-white"
		: "bg-red-600 hover:bg-red-500 nes-shadow";

	const classes = `${baseClasses} ${variantClasses}`;

	if (props.href) {
		return (
			<a href={props.href} class={classes}>
				{props.children}
			</a>
		);
	}

	return (
		<button onClick={props.onClick} class={classes}>
			{props.children}
		</button>
	);
}
