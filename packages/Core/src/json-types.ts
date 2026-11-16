/**
 * Concrete recursive JSON value types, used everywhere a `Configuration`/`Extensions` blob or
 * other free-form JSON column needs a type — in place of `unknown`, which a caller can smuggle
 * `any` back in through without the compiler ever flagging it.
 */
export type CommunityJsonPrimitive = string | number | boolean | null;
export type CommunityJsonValue =
  | CommunityJsonPrimitive
  | CommunityJsonValue[]
  | { [key: string]: CommunityJsonValue };
export type CommunityJsonObject = { [key: string]: CommunityJsonValue };
