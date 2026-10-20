import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PretestForm } from "./PretestForm";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
describe("pretest", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });
  it("resumes this user's draft and retains the choice when moving backwards", async () => {
    sessionStorage.setItem(
      "user-draft",
      JSON.stringify({ answers: [2, ...Array(17).fill(null)], safety: null, step: 1 }),
    );
    render(<PretestForm draftKey="user-draft" />);
    await screen.findByRole("heading", { name: "You felt depressed." });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "2 Most of the time" })).toBeChecked();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires each question, accepts number keys and persists before continuing", async () => {
    render(<PretestForm draftKey="new-user" />);
    await screen.findByRole("heading", { name: "Your daily life felt interesting." });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "3" });
    expect(screen.getByRole("radio", { name: "3 A good bit of the time" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(JSON.parse(sessionStorage.getItem("new-user")!)).toMatchObject({
      step: 1,
      answers: [3, ...Array(17).fill(null)],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits mandatory safety zero and clears the saved draft only on success", async () => {
    sessionStorage.setItem(
      "draft",
      JSON.stringify({ answers: Array(18).fill(3), safety: null, step: 18 }),
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ stage: "awaiting_start" }), { status: 201 }),
    );
    render(<PretestForm draftKey="draft" />);
    await screen.findByRole("button", { name: "Finish check-in" });
    expect(screen.getByRole("button", { name: "Finish check-in" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "0 Not at all" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish check-in" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pretest/result"));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({
      answers: Array(18).fill(3),
      safety_answer: 0,
    });
    expect(sessionStorage.getItem("draft")).toBeNull();
  });

  it("shows support immediately even when saving the safety response fails", async () => {
    sessionStorage.setItem(
      "draft",
      JSON.stringify({ answers: Array(18).fill(3), safety: null, step: 18 }),
    );
    vi.mocked(fetch).mockRejectedValue(new Error("network unavailable"));
    render(<PretestForm draftKey="draft" />);
    await screen.findByRole("button", { name: "Finish check-in" });
    fireEvent.click(screen.getByRole("radio", { name: "1 Several days" }));
    expect(screen.getByRole("heading", { name: "Support is here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "14416" })).toHaveAttribute("href", "tel:14416");
    expect(screen.getByRole("link", { name: "112" })).toHaveAttribute("href", "tel:112");
    await screen.findByRole("button", { name: "Save check-in" });
    expect(JSON.parse(sessionStorage.getItem("draft")!).safety).toBe(1);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
