import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("associates label with input and links helper text", () => {
    render(<Input label="Username" helper="3 to 20 characters" />);
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAccessibleDescription("3 to 20 characters");
  });

  it("marks invalid input and links the error, in calm tone (no alarm)", () => {
    render(<Input label="Email" error="Please check this field" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Please check this field");
    expect(input.className).toContain("border-danger-soft");
    expect(input.className).not.toContain("red");
  });
});
