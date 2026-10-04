import { Component } from 'react';
import { Button, Card, EmptyState } from '../design/ui';

/**
 * Keeps one broken screen from blanking the app; the shell stays usable.
 *
 * It used to show the same sentence to everyone and swallow the cause, so a
 * render crash looked identical on Home and on Admin Overview and left nothing
 * to act on (Bilal, 4 Oct). A founder still sees calm copy — a stack trace is
 * not their problem. STAFF see what actually failed.
 *
 * What staff are shown is deliberately narrow: the error name and message, the
 * screen, and the HTTP status / error code / request id when the failure came
 * from an API call (lib/auth.js attaches those). The response BODY is never
 * rendered: it can carry company data, and a diagnostic panel is not a reason
 * to put customer information on screen.
 */
import { errorDetails } from '../lib/errorDetails';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Name the screen, so a production log line is traceable to a route.
    console.error(`[screen] ${this.props.resetKey || ''}`, error, info?.componentStack?.slice(0, 400));
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null, copied: false });
  }

  retry = () => this.setState({ error: null, copied: false });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { staff = false, resetKey } = this.props;

    if (!staff) {
      return (
        <EmptyState
          icon="alert"
          title="This screen couldn't be shown."
          body="Something in the data didn't look as expected. Try again, or go back to Home."
          action={<Button variant="primary" onClick={this.retry}>Try again</Button>}
        />
      );
    }

    const rows = errorDetails(error, resetKey);
    return (
      <Card
        title="This screen couldn't be shown."
        subtitle="Staff only. Send these details with a bug report; they contain no company data."
      >
        <dl className="eb-details" data-testid="error-details">
          {rows.map(([k, v]) => (
            <div className="eb-row" key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="ui-row">
          <Button variant="primary" onClick={this.retry}>Try again</Button>
          <Button
            variant="secondary"
            onClick={() => {
              const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(text).then(() => this.setState({ copied: true }), () => {});
              }
            }}
          >
            {this.state.copied ? 'Copied' : 'Copy details'}
          </Button>
        </div>
      </Card>
    );
  }
}
