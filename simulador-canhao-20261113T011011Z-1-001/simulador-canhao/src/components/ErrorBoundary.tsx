/** Captura erros de renderização e mostra uma tela amigável em vez de uma página em branco. */
import React from 'react';

interface Props {
  children: React.ReactNode;
  onReset: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Erro na interface:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-screen" role="alert">
        <h2>Algo deu errado no simulador</h2>
        <p>O erro foi registrado no console. Você pode voltar ao início e tentar de novo.</p>
        <pre>{this.state.error.message}</pre>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            this.setState({ error: null });
            this.props.onReset();
          }}
        >
          Voltar ao início
        </button>
      </div>
    );
  }
}
