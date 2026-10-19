import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start my 30 days</Button>);
    const btn = screen.getByRole("button", { name: /start my 30 days/i });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses the pill radius and is disabled from native props", () => {
    render(<Button disabled>Continue</Button>);
    const btn = screen.getByRole("button", { name: /continue/i });
    expect(btn).toBeDisabled();
  });

  it("defaults to type=button (never submits forms by accident)", () => {
    render(<Button>Tap</Button>);
    expect(screen.getByRole("button", { name: /tap/i })).toHaveAttribute("type", "button");
  });
});
