import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "@/lib/config";

/** LibreOffice 미설치/실행 실패 식별용(라우트가 텍스트 카드로 폴백). */
export class LibreOfficeUnavailableError extends Error {}

/**
 * PPTX → PDF 변환(LibreOffice headless). 변환된 PDF 바이트 반환.
 * soffice가 없거나 실패하면 LibreOfficeUnavailableError — 슬라이드 이미지는 선택 기능이므로 폴백한다.
 * 외부 프로세스는 배열 인자 spawn(셸 보간 금지, 보안 §10). 동시 실행 충돌 방지를 위해 임시 프로필 사용.
 * ⚠️ 서버 전용.
 */
export function convertPptxToPdf(pptxPath: string): Promise<Uint8Array> {
  const outDir = mkdtempSync(join(tmpdir(), "iamspeaker-soffice-"));
  const profile = mkdtempSync(join(tmpdir(), "iamspeaker-loprofile-"));
  const args = [
    "--headless",
    `-env:UserInstallation=file://${profile}`,
    "--convert-to",
    "pdf",
    "--outdir",
    outDir,
    pptxPath,
  ];
  return new Promise<Uint8Array>((resolve, reject) => {
    const proc = spawn(config.LIBREOFFICE_BIN, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", (e) =>
      reject(new LibreOfficeUnavailableError(`LibreOffice 실행 불가: ${e.message}`)),
    );
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new LibreOfficeUnavailableError(
            `LibreOffice 변환 실패 (code ${code}): ${stderr.slice(-200)}`,
          ),
        );
        return;
      }
      const pdf = readdirSync(outDir).find((f) => f.toLowerCase().endsWith(".pdf"));
      if (!pdf) {
        reject(new LibreOfficeUnavailableError("변환된 PDF를 찾을 수 없습니다"));
        return;
      }
      try {
        resolve(new Uint8Array(readFileSync(join(outDir, pdf))));
      } catch (e) {
        reject(e);
      }
    });
  }).finally(() => {
    rmSync(outDir, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  });
}
