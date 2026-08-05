interface Props {
  idle?: boolean;
  size?: 'md' | 'sm';
}

export function QBlock({ idle = true, size = 'md' }: Props): React.JSX.Element {
  const cls = ['qblock', idle ? 'idle' : '', size === 'sm' ? 'sm' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className="qm">?</span>
      <span className="rivet tl" />
      <span className="rivet tr" />
      <span className="rivet bl" />
      <span className="rivet br" />
    </div>
  );
}
