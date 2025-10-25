import type { RequiredParams, OptionalParams } from './params.ts';
import type { ParseResult } from './parse.ts';
import type { RoutePattern } from './route-pattern.ts';
import type { Variant } from './variant.ts';
export declare class MissingParamError extends Error {
    readonly paramName: string;
    constructor(paramName: string);
}
export declare function createHrefBuilder<T extends string | RoutePattern = string>(): HrefBuilder<T>;
export declare function formatHref(parsed: ParseResult, params?: Record<string, any>, searchParams?: Record<string, any>): string;
export interface HrefBuilder<T extends string | RoutePattern = string> {
    <P extends string extends T ? string : SourceOf<T> | Variant<SourceOf<T>>>(pattern: P | RoutePattern<P>, ...args: HrefBuilderArgs<P>): string;
}
type SourceOf<T> = T extends string ? T : T extends RoutePattern<infer S extends string> ? S : never;
export type HrefBuilderArgs<T extends string> = [
    RequiredParams<T>
] extends [never] ? [
] | [null | undefined | Record<string, any>] | [null | undefined | Record<string, any>, HrefSearchParams] : [
    HrefParams<T>,
    HrefSearchParams
] | [HrefParams<T>];
type HrefParams<T extends string> = Record<RequiredParams<T>, ParamValue> & Partial<Record<OptionalParams<T>, ParamValue | null | undefined>>;
type HrefSearchParams = NonNullable<ConstructorParameters<typeof URLSearchParams>[0]> | Record<string, ParamValue>;
type ParamValue = string | number | bigint | boolean;
export {};
//# sourceMappingURL=href.d.ts.map