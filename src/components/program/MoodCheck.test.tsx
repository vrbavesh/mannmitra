import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MoodCheck } from "./MoodCheck";

describe("MoodCheck", () => {
  it("renders an accessible 0 to 10 radio scale and reports the chosen value", () => {
    const onChange = vi.fn();
    render(
      <MoodCheck
        name="mood"
        value={null}
        onChange={onChange}
        legend="Your mood"
        hint="Choose what feels closest."
      />,
    );
    expect(screen.getByText("Your mood")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(11);
    expect(screen.getByLabelText("0 out of 10, Very low")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("7 out of 10, Good"));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("reflects the controlled value and can be disabled", () => {
    render(<MoodCheck name="mood" value={4} onChange={() => undefined} legend="Mood" disabled />);
    expect((screen.getByLabelText("4 out of 10, Okay") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText("0 out of 10, Very low")).toBeDisabled();
  });
});
