import type { Parse, ParsedPattern, ParseResult, Separator, Token } from './parse.ts';
import type { Stringify, StartsWithSeparator } from './stringify.ts';
export declare function join(a: ParseResult, b: ParseResult): string;
export type Join<A extends string, B extends string> = _Join<Parse<A>, Parse<B>>;
type _Join<A extends ParsedPattern, B extends ParsedPattern> = Stringify<{
    protocol: JoinOriginField<A, B, 'protocol'>;
    hostname: JoinOriginField<A, B, 'hostname'>;
    port: JoinOriginField<A, B, 'port'>;
    pathname: JoinPathnames<A['pathname'], B['pathname']>;
    search: JoinSearch<A['search'], B['search']>;
}>;
type JoinOriginField<A extends ParsedPattern, B extends ParsedPattern, Field extends 'protocol' | 'hostname' | 'port'> = B['hostname'] extends Token[] ? B[Field] : A[Field];
type JoinPathnames<A extends Token[] | undefined, B extends Token[] | undefined> = B extends undefined ? A : B extends [] ? A : A extends undefined ? B : A extends [] ? B : A extends Token[] ? B extends Token[] ? JoinPathnameTokens<RemoveTrailingSeparator<A>, B> : never : never;
type RemoveTrailingSeparator<T extends Token[]> = T extends [...infer Rest extends Token[], Separator] ? Rest : T;
type JoinPathnameTokens<A extends Token[], B extends Token[]> = B extends [Separator] ? A : StartsWithSeparator<B> extends true ? [
    ...A,
    ...B
] : [
    ...A,
    Separator,
    ...B
];
type JoinSearch<A extends string | undefined, B extends string | undefined> = B extends undefined ? A : A extends undefined ? B : `${A}&${B}`;
export {};
//# sourceMappingURL=join.d.ts.map