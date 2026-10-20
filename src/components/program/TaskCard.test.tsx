import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskCard } from "./TaskCard";

const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const props = {
  dayNo: 1,
  title: "Notice five things",
  description: "A short grounding practice.",
  exampleText: "Name five things you can see.",
  component: "mood_check",
  config: {},
  duration: "10 to 15 minutes",
  isRestDay: false,
};

function choose(label: string) {
  fireEvent.click(screen.getByLabelText(label));
}

describe("TaskCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      json({
        day_no: 1,
        status: "done",
        completed_at: "2026-10-20T09:12:00Z",
        days_completed: 1,
      }),
    );
  });

  it("requires a mood before and after, then saves the completion payload", async () => {
    render(<TaskCard {...props} />);
    const begin = screen.getByRole("button", { name: "Begin today's practice" });
    expect((begin as HTMLButtonElement).disabled).toBe(true);

    choose("4 out of 10, Okay");
    expect((begin as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(begin);

    expect(screen.getByText("Notice five things")).toBeTruthy();
    choose("8 out of 10, Really good");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByLabelText("9 out of 10, Very good"));
    fireEvent.click(screen.getByRole("button", { name: "Finish day 1" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/program/days/1/complete");
    const body = JSON.parse(String(init.body));
    expect(body.mood_before).toBe(4);
    expect(body.mood_after).toBe(9);
    expect(body.time_taken_s).toBeTypeOf("number");
    expect(body.payload).toEqual({ activity_mood: 8 });

    await screen.findByText("Day 1 is complete.");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("shows a calm message and stays on the after check when saving fails", async () => {
    fetchMock.mockResolvedValue(
      json({ error: { code: "day_closed", message: "This day's window has closed." } }, 409),
    );
    render(<TaskCard {...props} />);
    choose("5 out of 10, Steady");
    fireEvent.click(screen.getByRole("button", { name: "Begin today's practice" }));
    choose("6 out of 10, Fairly good");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByLabelText("7 out of 10, Good"));
    fireEvent.click(screen.getByRole("button", { name: "Finish day 1" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This day's window has closed.");
    expect(screen.queryByText("Day 1 is complete.")).toBeNull();
  });

  it("falls back gracefully when the task component is not registered", () => {
    render(<TaskCard {...props} component="unknown_component" />);
    choose("5 out of 10, Steady");
    fireEvent.click(screen.getByRole("button", { name: "Begin today's practice" }));
    expect(screen.getByText(/still being prepared/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("And how do you feel now?")).toBeTruthy();
  });
});
