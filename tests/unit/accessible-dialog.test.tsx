// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { useAccessibleDialog } from "@/lib/hooks/useAccessibleDialog";

/**
 * UX_REVIEW Tier 3 — the hand-rolled overlays in live-session/ and video-call/
 * were not dialogs to a keyboard user.
 *
 * They rendered a backdrop and a panel and nothing else: Escape did nothing, so
 * a keyboard user who had not yet reached the close button had no way out; Tab
 * walked straight past the panel into the page behind the backdrop, where they
 * could not see where they were; and closing dropped focus to the top of the
 * document, losing their place.
 *
 * `useAccessibleDialog` is the single implementation all three now share. These
 * tests drive it through a real DOM rather than asserting on source text —
 * "Escape closes it" is a behaviour, and only a behavioural test can show it.
 */

function Dialog({
  onClose,
  enabled = true,
  buttons = 2,
}: {
  onClose: () => void;
  enabled?: boolean;
  buttons?: number;
}) {
  const dialog = useAccessibleDialog({ onClose, label: "Test dialog", enabled });
  return (
    <div {...dialog.props}>
      {Array.from({ length: buttons }).map((_, i) => (
        <button key={i}>action {i + 1}</button>
      ))}
    </div>
  );
}

/** A focusable control outside the dialog — where focus must never escape to. */
function Page(props: React.ComponentProps<typeof Dialog> & { open?: boolean }) {
  const { open = true, ...rest } = props;
  return (
    <>
      <button>outside before</button>
      {open && <Dialog {...rest} />}
      <button>outside after</button>
    </>
  );
}

afterEach(cleanup);

describe("useAccessibleDialog — Escape closes", () => {
  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<Page onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from anywhere, not only when the panel has focus", () => {
    const onClose = vi.fn();
    render(<Page onClose={onClose} />);

    screen.getByText("outside after").focus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys", () => {
    const onClose = vi.fn();
    render(<Page onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "a" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does nothing once disabled", () => {
    const onClose = vi.fn();
    render(<Page onClose={onClose} enabled={false} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops listening after unmount", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Page onClose={onClose} />);

    unmount();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useAccessibleDialog — focus trap", () => {
  it("moves focus into the dialog on open", () => {
    render(<Page onClose={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByText("action 1"));
  });

  it("wraps forward from the last control to the first", () => {
    render(<Page onClose={vi.fn()} />);
    const last = screen.getByText("action 2");
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    // Without the trap the browser would move to "outside after".
    expect(document.activeElement).toBe(screen.getByText("action 1"));
  });

  it("wraps backward from the first control to the last", () => {
    render(<Page onClose={vi.fn()} />);
    const first = screen.getByText("action 1");
    first.focus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(screen.getByText("action 2"));
  });

  it("pulls focus back if it is already outside", () => {
    render(<Page onClose={vi.fn()} />);
    screen.getByText("outside before").focus();

    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(screen.getByText("action 2"));
  });

  it("keeps focus on the panel when it holds nothing focusable", () => {
    const { container } = render(<Page onClose={vi.fn()} buttons={0} />);
    const panel = container.querySelector('[role="dialog"]')!;

    fireEvent.keyDown(panel, { key: "Tab" });

    expect(document.activeElement).toBe(panel);
  });

  it("leaves the page alone when disabled", () => {
    render(<Page onClose={vi.fn()} enabled={false} />);
    const outside = screen.getByText("outside before");
    outside.focus();

    fireEvent.keyDown(outside, { key: "Tab" });

    // Not trapped: the handler is not installed at all.
    expect(document.activeElement).toBe(outside);
  });
});

describe("useAccessibleDialog — focus restoration", () => {
  it("returns focus to the control that opened it", () => {
    // Closing a dialog used to drop focus to the top of the document, so the
    // next Tab restarted from the page's first link instead of resuming where
    // the user was.
    const { rerender } = render(<Page onClose={vi.fn()} open={false} />);
    const opener = screen.getByText("outside before");
    opener.focus();

    rerender(<Page onClose={vi.fn()} open />);
    expect(document.activeElement).toBe(screen.getByText("action 1"));

    rerender(<Page onClose={vi.fn()} open={false} />);
    expect(document.activeElement).toBe(opener);
  });

  it("does not steal focus back if the user has already moved on", () => {
    const { rerender } = render(<Page onClose={vi.fn()} open={false} />);
    screen.getByText("outside before").focus();

    rerender(<Page onClose={vi.fn()} open />);

    // The user clicks something else while the dialog is still mounted.
    const elsewhere = screen.getByText("outside after");
    elsewhere.focus();
    rerender(<Page onClose={vi.fn()} open={false} />);

    expect(document.activeElement).toBe(elsewhere);
  });
});

describe("useAccessibleDialog — announced as a dialog", () => {
  it("marks the container with the right role and name", () => {
    render(<Page onClose={vi.fn()} />);

    const panel = screen.getByRole("dialog", { name: "Test dialog" });
    expect(panel.getAttribute("aria-modal")).toBe("true");
    // Focusable as a last resort, but never in the natural tab order.
    expect(panel.getAttribute("tabindex")).toBe("-1");
  });
});
