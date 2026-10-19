import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom does not implement <dialog>.showModal()/.close(). Stub the two native
// methods so our Dialog's open effect can run; behavior (focus trap, Escape,
// restore) stays the browser's responsibility and is verified manually/e2e.
if (!window.HTMLDialogElement.prototype.showModal) {
  window.HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  window.HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
}
