export function QBlock({ idle = true }: { idle?: boolean }): React.JSX.Element {
  return (
    <div className={idle ? 'qblock idle' : 'qblock'}>
      <span className="qm">?</span>
      <span className="rivet tl" />
      <span className="rivet tr" />
      <span className="rivet bl" />
      <span className="rivet br" />
    </div>
  );
}
