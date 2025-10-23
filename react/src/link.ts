import {
	type ComponentPropsWithRef,
	type MouseEvent,
	type PropsWithChildren,
	useCallback,
    createElement,
} from "react";
import {useRouter} from "./router";

export function Link({
	onClick,
	href,
	external,
	...props
}: PropsWithChildren<
	ComponentPropsWithRef<"a"> & {
		external?: boolean;
	}
>) {
	const router = useRouter()
	const onClickImpl = useCallback(
		(e: MouseEvent<HTMLAnchorElement>) => {
			onClick?.(e);
			if (href) {
				e.preventDefault();
				router.navigate(href)
			}
		},
		[href, onClick, router],
	);
    return createElement(
        "a",
        {
            ...props,
            href: href,
            target: external ? "_blank" : undefined,
            onClick: onClickImpl,
        }
    )
}
