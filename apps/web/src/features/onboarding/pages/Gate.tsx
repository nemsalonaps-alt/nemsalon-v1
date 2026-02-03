import type { GateState } from '../types';
import { copy } from '../copy';

type GateProps = {
  state: GateState;
  onRetry: () => void;
};

export function Gate({ state, onRetry }: GateProps) {
  if (state === 'checking') {
    return (
      <div className="panel">
        <span className="badge">{copy.gate.checking.badge}</span>
        <h1>{copy.gate.checking.title}</h1>
        <p>{copy.gate.checking.body}</p>
        <div className="note">{copy.gate.checking.note}</div>
      </div>
    );
  }

  if (state === 'has-salon') {
    return (
      <div className="panel">
        <span className="badge">{copy.gate.hasSalon.badge}</span>
        <h1>{copy.gate.hasSalon.title}</h1>
        <p>{copy.gate.hasSalon.body}</p>
        <div className="btn-row">
          <button className="btn primary" type="button">
            {copy.gate.hasSalon.primaryAction}
          </button>
          <button className="btn ghost" type="button">
            {copy.gate.hasSalon.secondaryAction}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'needs-login') {
    return (
      <div className="panel">
        <span className="badge">{copy.gate.needsLogin.badge}</span>
        <h1>{copy.gate.needsLogin.title}</h1>
        <p>{copy.gate.needsLogin.body}</p>
        <div className="btn-row">
          <button className="btn primary" type="button">
            {copy.gate.needsLogin.primaryAction}
          </button>
          <button className="btn ghost" type="button" onClick={onRetry}>
            {copy.gate.needsLogin.secondaryAction}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
