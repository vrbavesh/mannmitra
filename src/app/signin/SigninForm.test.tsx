import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SigninForm } from "@/app/signin/SigninForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const conflict =
  "An account with this email already exists. Please sign in with your email and password.";

describe("SigninForm", () => {
  it("shows the exact spec copy for a same-email Google conflict", () => {
    render(<SigninForm notice="google_conflict" />);
    expect(screen.getByRole("alert").textContent).toBe(conflict);
  });

  it("stays quiet when there is no notice", () => {
    render(<SigninForm />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers Google sign in as a plain link", () => {
    render(<SigninForm />);
    expect(screen.getByRole("link", { name: /continue with google/i })).toHaveAttribute(
      "href",
      "/api/auth/google",
    );
  });
});
