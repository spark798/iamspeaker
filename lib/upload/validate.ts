import { Errors } from "@/lib/errors";

export interface UploadLimits {
  allowedExt: string[];
  maxBytes: number;
}

/** 확장자별 매직바이트 검사(내용-형식 불일치 차단). */
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  // %PDF
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  // PK.. (zip local/empty/spanned header) — OOXML
  pptx: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
};

/**
 * 업로드 파일 검증: 확장자 화이트리스트 + 크기 한도 + 매직바이트(보안 §10).
 * 통과 시 소문자 확장자를 반환, 위반 시 AppError throw.
 */
export function validateUploadFile(
  filename: string,
  bytes: Uint8Array,
  limits: UploadLimits,
): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (!limits.allowedExt.includes(ext)) {
    throw Errors.unsupportedMedia(`허용되지 않는 형식입니다: ${ext || "(없음)"}`);
  }
  if (bytes.byteLength === 0) {
    throw Errors.badRequest("빈 파일입니다");
  }
  if (bytes.byteLength > limits.maxBytes) {
    throw Errors.payloadTooLarge(
      `파일이 너무 큽니다 (최대 ${Math.round(limits.maxBytes / 1048576)}MB)`,
    );
  }
  const magic = MAGIC[ext];
  if (magic && !magic(bytes)) {
    throw Errors.badRequest("파일 내용이 형식과 일치하지 않습니다");
  }
  return ext;
}
