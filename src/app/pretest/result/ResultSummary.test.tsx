import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResultSummary } from "./ResultSummary";
const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const props = {
  sessionId: "session-id",
  score: 48.9,
  severity: "moderate" as const,
  areas: { anxiety_pct: 53.3, depression_pct: 51.1, negmood_pct: 53.3 },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});
it("shows the score, primary track, bonus and counsellor nudge, then starts from this session", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ stage: "active" }), { status: 201 }),
  );
  render(<ResultSummary {...props} />);
  expect(screen.getByText("48.9%", { exact: true })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Finding calm" })).toBeInTheDocument();
  expect(screen.getByText(/Bonus suggestion: A kinder inner voice/)).toBeInTheDocument();
  expect(screen.getByText(/also find it helpful to speak with a counsellor/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Start my 30 days" }));
  expect(screen.getByRole("button", { name: "Starting your program..." })).toBeDisabled();
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/home"));
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({
    pre_session_id: "session-id",
  });
});
it("keeps a failed start retryable without losing the result", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  render(<ResultSummary {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Start my 30 days" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Start my 30 days" })).toBeEnabled();
  expect(router.replace).not.toHaveBeenCalled();
});
it("offers optional participation and everyday tips for a minimal result", () => {
  render(<ResultSummary {...props} severity="minimal" score={90} />);
  expect(screen.getByText(/program is optional/)).toBeInTheDocument();
  expect(screen.getByText(/steady sleep routine/)).toBeInTheDocument();
  expect(
    screen.queryByText(/also find it helpful to speak with a counsellor/),
  ).not.toBeInTheDocument();
});
