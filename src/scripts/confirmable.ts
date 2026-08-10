/**
 * Two-step confirm for a destructive button: the first click arms it with a
 * confirm label; a second click within the window runs the action, otherwise
 * the button reverts. Originally lived inside Sandtray (Level/Clear), but the
 * arm-then-confirm pattern isn't sandtray-specific — any destructive action
 * without an undo-first UI can reuse it.
 */
export function confirmable(
  btn: HTMLButtonElement | null,
  label: string,
  confirmLabel: string,
  action: () => void,
): void {
  if (!btn) return;
  let timer: number | null = null;
  btn.addEventListener('click', () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
      btn.textContent = label;
      action();
      return;
    }
    btn.textContent = confirmLabel;
    timer = window.setTimeout(() => {
      timer = null;
      btn.textContent = label;
    }, 3000);
  });
}
