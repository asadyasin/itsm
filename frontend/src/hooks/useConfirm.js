// A minimal confirm() hook. Uses the native browser confirm dialog — simple and reliable,
// with a single call site so it's easy to swap for a styled MUI dialog later if desired.
export function useConfirm() {
  return (message) => Promise.resolve(window.confirm(message));
}
