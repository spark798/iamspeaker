import { expect, test } from "@playwright/test";

/**
 * Walking Skeleton E2E (API 구동) — 세션 생성 → 데모 작업 → 워커 처리 → 스크립트 저장까지 전 구간.
 * 실행: `pnpm e2e` (webServer가 pnpm dev 기동, instrumentation이 워커 실행).
 */
test("세션 생성 → 데모 작업 → 스크립트 생성", async ({ request }) => {
  const create = await request.post("/api/sessions", {
    data: {
      targetDurationSec: 300,
      tone: "formal",
      genre: "pitch",
      slides: [{ textContent: "Problem" }, { textContent: "Solution" }],
    },
  });
  expect(create.status()).toBe(201);
  const { id } = (await create.json()) as { id: string };

  const demo = await request.post(`/api/sessions/${id}/demo`);
  expect(demo.status()).toBe(202);
  const { jobId } = (await demo.json()) as { jobId: string };

  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/jobs/${jobId}`);
        return ((await res.json()) as { status: string }).status;
      },
      { timeout: 15_000, intervals: [250, 500, 1000] },
    )
    .toBe("succeeded");

  const script = await request.get(`/api/sessions/${id}/script`);
  expect(script.status()).toBe(200);
  const body = (await script.json()) as { content: unknown[] };
  expect(body.content).toHaveLength(2);

  // SCR-02 데모 음성: TTS 합성 → WAV 스트리밍(stub은 무음 WAV).
  const audio = await request.get(`/api/sessions/${id}/demo-audio?slide=0`);
  expect(audio.status()).toBe(200);
  expect(audio.headers()["content-type"]).toContain("audio/wav");
  expect((await audio.body()).byteLength).toBeGreaterThan(0);

  // SCR-07 자막 export: 데모 스크립트 → SRT 다운로드(타임스탬프 큐 포함).
  const srt = await request.get(`/api/sessions/${id}/subtitle`);
  expect(srt.status()).toBe(200);
  expect(srt.headers()["content-type"]).toContain("subrip");
  expect(await srt.text()).toMatch(/00:00:00,000 --> /);
});
