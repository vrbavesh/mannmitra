import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingForm } from "./OnboardingForm";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const continueButton = () => screen.getByRole("button", { name: "Continue" });

async function chooseUsername() {
  await screen.findByRole("textbox", { name: "Username" });
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "river_otter" } });
  await screen.findByText("That username is available.");
  fireEvent.click(continueButton());
}

describe("OnboardingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        url.includes("/username")
          ? json({ available: true })
          : init?.method === "POST"
            ? json({ stage: "needs_pretest" })
            : json({
                display_name: "Google Name",
                timezone: "Asia/Kolkata",
                stage: "needs_onboarding",
              }),
      ),
    );
  });

  it("rejects uppercase/spaces locally and checks only after the debounce", async () => {
    await act(async () => {
      render(<OnboardingForm />);
    });
    await screen.findByLabelText("Username");
    vi.useFakeTimers();
    try {
      for (const value of ["Upper", "a b"]) {
        fireEvent.change(screen.getByLabelText("Username"), { target: { value } });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });
        expect(continueButton()).toBeDisabled();
      }
      expect(fetchMock).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByLabelText("Username"), { target: { value: "river_otter" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(399);
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(continueButton()).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores a stale availability response for a previously typed username", async () => {
    let finishOld: (value: Response) => void = () => {};
    fetchMock.mockImplementation((url: string) =>
      url.includes("old_name")
        ? new Promise<Response>((resolve) => {
            finishOld = resolve;
          })
        : Promise.resolve(
            url.includes("new_name")
              ? json({ available: false })
              : json({ display_name: "", timezone: "Asia/Kolkata", stage: "needs_onboarding" }),
          ),
    );
    render(<OnboardingForm />);
    const input = await screen.findByLabelText("Username");
    fireEvent.change(input, { target: { value: "old_name" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.change(input, { target: { value: "new_name" } });
    await screen.findByText("That username is taken. Try another.");
    await act(async () => {
      finishOld(json({ available: true }));
    });
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText("That username is taken. Try another.")).toBeInTheDocument();
  });

  it("keeps Google prefill editable, requires age and all consents, and submits without a reminder", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);
    await chooseUsername();
    const name = screen.getByLabelText("Display name");
    expect(name).toHaveValue("Google Name");
    await user.clear(name);
    await user.type(name, "River");
    await user.click(continueButton());
    await user.click(screen.getByLabelText("Prefer not to say"));
    await user.click(continueButton());
    expect(continueButton()).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /18 or older/ }));
    await user.click(continueButton());
    expect(continueButton()).toBeDisabled();
    const checks = screen.getAllByRole("checkbox");
    await user.click(checks[0]);
    await user.click(checks[1]);
    expect(continueButton()).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
    await user.click(checks[2]);
    await user.click(continueButton());
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    await user.click(screen.getByRole("button", { name: "Save and continue" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/pretest"));
    const save = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(save?.[1].body)).toEqual({
      username: "river_otter",
      display_name: "River",
      gender: "prefer_not_to_say",
      age_confirmed: true,
      terms_accepted: true,
      privacy_accepted: true,
      non_diagnostic_accepted: true,
      reminder_time: null,
    });
  });

  it("starts email profiles with an empty name and keeps choices when navigating back", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ display_name: "", timezone: "Asia/Kolkata", stage: "needs_onboarding" }),
    );
    render(<OnboardingForm />);
    await chooseUsername();
    expect(continueButton()).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "River" } });
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByLabelText("Female"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Display name")).toHaveValue("River");
    fireEvent.click(continueButton());
    expect(screen.getByLabelText("Female")).toBeChecked();
  });
});
