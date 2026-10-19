import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("opens natively when open=true", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Delete your account?">
        This removes everything.
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", {
      name: /delete your account\?/i,
    }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog).toHaveTextContent("This removes everything.");
  });

  it("does not call onClose when clicking inside the padded content (only backdrop closes)", async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Confirm">
        <p>Body text</p>
      </Dialog>,
    );
    // Click the title (inside content) — must NOT close.
    await userEvent.click(screen.getByRole("heading", { name: "Confirm" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when Escape is pressed (cancel event)", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Confirm">
        Body
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    // Fire cancel the way a browser does on Escape.
    dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
