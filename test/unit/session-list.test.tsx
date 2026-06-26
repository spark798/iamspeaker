import { SessionList } from "@/components/session-list";
import messages from "@/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const sessions = [
  {
    id: "s1",
    createdAt: 1_700_000_000_000,
    genre: "pitch",
    targetDurationSec: 300,
    slideFileName: "deck.pdf",
    recordingCount: 3,
    lastPracticedAt: 1_700_100_000_000,
  },
  {
    id: "s2",
    createdAt: 1_699_000_000_000,
    genre: "talk",
    targetDurationSec: 600,
    slideFileName: null,
    recordingCount: 0,
    lastPracticedAt: null,
  },
];

function renderList() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <SessionList />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("SessionList", () => {
  it("세션 목록을 렌더(라벨·장르·열기/기록 링크)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ sessions }),
      })) as unknown as typeof fetch,
    );
    renderList();
    // 파일명 라벨 + 무제 폴백
    expect(await screen.findByText("deck.pdf")).toBeInTheDocument();
    expect(screen.getByText(messages.dashboard.untitled)).toBeInTheDocument();
    // 녹음 있는 세션은 기록 링크, 없는 세션(s2)은 열기만
    const links = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(links).toContain("/demo?session=s1");
    expect(links).toContain("/progress?session=s1");
    expect(links).toContain("/demo?session=s2");
    expect(links).not.toContain("/progress?session=s2");
  });

  it("세션이 없으면 아무것도 렌더하지 않음", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ sessions: [] }),
      })) as unknown as typeof fetch,
    );
    const { container } = renderList();
    // 비동기 fetch 후에도 빈 상태 → 컨테이너 비어있음
    await Promise.resolve();
    expect(container.querySelector("ul")).toBeNull();
  });
});
