import type { SlideContent } from "@/lib/domain";
import { strFromU8, unzipSync } from "fflate";

/** PPTX(OOXML)에서 슬라이드별 텍스트 + 노트를 추출. LibreOffice 불필요(zip+XML 파싱). */

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** `<a:t>` 텍스트 런을 모두 모아 공백으로 합친다. */
function extractRunText(xml: string): string {
  const out: string[] = [];
  const re = /<a:t>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null = re.exec(xml);
  while (m !== null) {
    out.push(decodeXmlEntities(m[1] ?? ""));
    m = re.exec(xml);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function slideNumber(key: string): number {
  return Number(key.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

/** zip 내부 경로를 정규화(.. 해소). */
function resolvePath(baseDir: string, target: string): string {
  const stack: string[] = [];
  for (const part of `${baseDir}/${target}`.split("/")) {
    if (part === "..") stack.pop();
    else if (part !== "." && part !== "") stack.push(part);
  }
  return stack.join("/");
}

function readNotes(files: Record<string, Uint8Array>, slideKey: string): string | null {
  const n = slideNumber(slideKey);
  const rels = files[`ppt/slides/_rels/slide${n}.xml.rels`];
  if (!rels) return null;
  const target = strFromU8(rels).match(/Target="([^"]*notesSlide[^"]*)"/)?.[1];
  if (!target) return null;
  const notesData = files[resolvePath("ppt/slides", target)];
  if (!notesData) return null;
  const text = extractRunText(strFromU8(notesData));
  return text.length > 0 ? text : null;
}

export function parsePptx(bytes: Uint8Array): SlideContent[] {
  const files = unzipSync(bytes);
  const slideKeys = Object.keys(files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  return slideKeys.map((key, index) => {
    const data = files[key];
    const textContent = data ? extractRunText(strFromU8(data)) : "";
    return { index, textContent, notes: readNotes(files, key) };
  });
}
