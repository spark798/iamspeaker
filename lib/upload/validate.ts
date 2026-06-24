import { Errors } from "@/lib/errors";

export interface UploadLimits {
  allowedExt: string[];
  maxBytes: number;
}

/** bytes[offset..]가 ASCII 문자열로 시작하는가. */
function asciiAt(b: Uint8Array, offset: number, ascii: string): boolean {
  for (let i = 0; i < ascii.length; i++) {
    if (b[offset + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

// 컨테이너/스트림 시그니처(재사용).
const isOgg = (b: Uint8Array) => asciiAt(b, 0, "OggS"); // ogg/oga/opus
const isFtyp = (b: Uint8Array) => asciiAt(b, 4, "ftyp"); // ISO-BMFF: m4a/mp4/aac(in mp4)
// MPEG-1/2 오디오 프레임 동기(11비트 1) — mp3 프레임 시작.
const isMpegSync = (b: Uint8Array) => b[0] === 0xff && ((b[1] ?? 0) & 0xe0) === 0xe0;
// AAC ADTS 동기(12비트 1, layer=00) — raw aac.
const isAdts = (b: Uint8Array) => b[0] === 0xff && ((b[1] ?? 0) & 0xf6) === 0xf0;

/** 확장자별 매직바이트 검사(내용-형식 불일치 차단). */
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  // %PDF
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  // PK.. (zip local/empty/spanned header) — OOXML
  pptx: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  // 오디오(녹음/데모) — 컨테이너/스트림 시그니처. MediaRecorder는 webm(EBML) 또는 mp4(ftyp).
  wav: (b) => asciiAt(b, 0, "RIFF") && asciiAt(b, 8, "WAVE"),
  webm: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3, // EBML(Matroska)
  ogg: isOgg,
  oga: isOgg,
  opus: isOgg,
  m4a: isFtyp,
  mp4: isFtyp,
  // mp3: ID3 태그 또는 MPEG 프레임 동기로 시작.
  mp3: (b) => asciiAt(b, 0, "ID3") || isMpegSync(b),
  // aac: raw ADTS 스트림 또는 mp4 컨테이너.
  aac: (b) => isAdts(b) || isFtyp(b),
};

/**
 * 본문을 메모리에 적재하기 전 크기 한도 검사(메모리 DoS 방어).
 * File.size는 바디를 읽지 않고 알 수 있으므로 arrayBuffer() 호출 전에 거른다.
 */
export function assertSizeWithinLimit(size: number, maxBytes: number): void {
  if (size > maxBytes) {
    throw Errors.payloadTooLarge(`파일이 너무 큽니다 (최대 ${Math.round(maxBytes / 1048576)}MB)`);
  }
}

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
