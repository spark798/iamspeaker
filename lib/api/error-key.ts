/**
 * HTTP 상태코드를 `errors` i18n 키로 매핑한다(사용자 친화 메시지, Q2-8).
 * 서버 에러 메시지는 한국어 하드코딩이므로, 멀티로케일 클라이언트는 상태코드 기준으로
 * 현지화 메시지를 보여준다. 매핑 없으면 null → 호출부의 기본 키 사용.
 */
export function errorKeyForStatus(status: number): "tooManyRequests" | "tooLarge" | null {
  if (status === 429) return "tooManyRequests";
  if (status === 413) return "tooLarge";
  return null;
}
