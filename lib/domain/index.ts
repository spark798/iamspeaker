/**
 * 도메인 타입 단일 진실원.
 * 어댑터(lib/ai), DB(lib/db), 분석(lib/analysis)이 모두 여기서 import 한다.
 * 같은 개념을 다른 곳에서 재정의하지 말 것.
 */
export type * from "./analysis";
export type * from "./baseline";
export type * from "./job";
export type * from "./l1";
export type * from "./qa";
export type * from "./script";
export type * from "./slides";
export type * from "./transcript";
