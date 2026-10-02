import { Component } from 'react';
import { Button, EmptyState } from '../design/ui';

/** Keeps one broken screen from blanking the app; the shell stays usable. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[screen]', error); // eslint-disable-line no-console
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState icon="alert" title="This screen couldn't be shown."
        body="Something in the data didn't look as expected. Try again, or go back to Home."
        action={<Button variant="primary" onClick={() => this.setState({ error: null })}>Try again</Button>} />
    );
  }
}
