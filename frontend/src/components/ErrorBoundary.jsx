import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Savora app crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-wrapper section-shell flex min-h-screen items-center">
          <div className="container-main">
            <div className="glass-card card-shell mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Application Error</p>
              <h1 className="mt-4 text-4xl font-black text-white">Something went wrong</h1>
              <p className="mt-4 text-[#a1a1b5]">
                Savora hit an unexpected error. Reload the app to recover without a blank screen.
              </p>
              <button onClick={this.handleReload} className="btn-primary mt-8">
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
