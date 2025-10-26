import {
  type ReactNode,
  type PropsWithChildren,
  Suspense,
  createElement,
} from "react";
import { ErrorBoundary } from "react-error-boundary";

export function Boundary({
  children,
  errorFallback,
  suspenseFallback,
}: PropsWithChildren<{
  errorFallback: React.ReactNode;
  suspenseFallback: React.ReactNode;
}>) {
  return createElement(
    ErrorBoundary,
    { fallback: errorFallback },
    createElement(Suspense, { fallback: suspenseFallback }, children),
  );
}
