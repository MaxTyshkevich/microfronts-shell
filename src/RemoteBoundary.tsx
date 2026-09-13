import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@microfronts/ui';
export class RemoteBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Remote ' + this.props.name + ' failed', error, info); }
  render() {
    return this.state.failed ? <div role="alert">
      <p>Модуль {this.props.name} недоступен. Остальные части приложения продолжают работать.</p>
      <Button onClick={() => window.location.reload()}>Перезагрузить страницу</Button>
    </div> : this.props.children;
  }
}
