import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LandingEffects from "./LandingEffects";

vi.mock("next/dynamic", () => ({
  default: () =>
    function Scene({ active }: { active: boolean }) {
      return <div data-testid="scene" data-active={active} />;
    },
}));
vi.mock("motion", () => ({ inView: () => vi.fn() }));
vi.mock("motion/mini", () => ({ animate: vi.fn() }));

let intersection: IntersectionObserverCallback;
let mediaChanges: (() => void)[];
let reduced = false;
const disconnect = vi.fn();
const removeMedia = vi.fn();

beforeEach(() => {
  reduced = false;
  mediaChanges = [];
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) => {
      mediaChanges.push(callback);
    },
    removeEventListener: removeMedia,
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  Object.defineProperty(navigator, "hardwareConcurrency", { value: 4, configurable: true });
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("pauses rendering when hidden or outside the viewport and resumes on return", async () => {
  render(
    <div id="landing">
      <LandingEffects />
    </div>,
  );
  await waitFor(() => expect(screen.getByTestId("scene")).toHaveAttribute("data-active", "true"));
  act(() =>
    intersection(
      [{ isIntersecting: false }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
  expect(screen.getByTestId("scene")).toHaveAttribute("data-active", "false");
  act(() =>
    intersection(
      [{ isIntersecting: true }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
  expect(screen.getByTestId("scene")).toHaveAttribute("data-active", "true");
  act(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(screen.getByTestId("scene")).toHaveAttribute("data-active", "false");
});

it("unloads the scene when reduced motion is enabled and cleans up observers", async () => {
  const view = render(
    <div id="landing">
      <LandingEffects />
    </div>,
  );
  await screen.findByTestId("scene");
  act(() => {
    reduced = true;
    mediaChanges.forEach((callback) => callback());
  });
  expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(removeMedia).toHaveBeenCalledTimes(2);
});

it("does not create a scene on a device with only two processor threads", async () => {
  Object.defineProperty(navigator, "hardwareConcurrency", { value: 2, configurable: true });
  const view = render(
    <div id="landing">
      <LandingEffects />
    </div>,
  );
  await waitFor(() =>
    expect(view.container.querySelector('[data-scene-mode="static"]')).not.toBeNull(),
  );
  expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
});
