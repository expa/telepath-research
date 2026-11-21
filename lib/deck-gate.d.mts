import type { IncomingMessage, ServerResponse } from "node:http";

export declare const PASSWORD_SHA256: string;
export declare const COOKIE: string;
export declare const TOKEN: string;
export declare const DECK_GATE_ROUTES: {
  src: string;
  missing: { type: "cookie"; key: string; value: string }[];
  dest: string;
}[];
export declare function unlocked(cookieHeader?: string): boolean;
export declare function handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
export declare function gateMiddleware(req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void): void;
