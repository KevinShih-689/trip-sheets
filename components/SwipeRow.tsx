interface SwipeRowProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Below the desktop breakpoint, children (`.swipe-item`) scroll horizontally
 * with snap points, leaving the next item peeking to hint at a swipe.
 * On desktop the row has no styles of its own, so `className` decides layout.
 * Focusable so keyboard users can scroll it with the arrow keys.
 */
export function SwipeRow({ label, className, children }: SwipeRowProps): React.JSX.Element {
  return (
    <div
      className={className ? `swipe-row ${className}` : 'swipe-row'}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
