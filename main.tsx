import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Defining interfaces for ErrorBoundary to ensure proper TypeScript inference
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declaring state as a property of the class to satisfy strict property checks
  public state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  // Lifecycle method for updating state when an error occurs
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CRM Error Catch:", error, errorInfo);
  }

  render() {
    // Correctly accessing state via the typed class property
    // Fixes Error: Property 'state' does not exist on type 'ErrorBoundary'
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1>Algo deu errado na renderização.</h1>
          <button onClick={() => window.location.reload()}>Recarregar Sistema</button>
        </div>
      );
    }
    // Correctly accessing props via the typed class property
    // Fixes Error: Property 'props' does not exist on type 'ErrorBoundary'
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
