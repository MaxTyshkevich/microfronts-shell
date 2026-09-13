import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createApp } from './App';
import { readConfig } from './config';
import './styles.css';
const root = createRoot(document.getElementById('root')!);
readConfig().then((config) => {
  const App = createApp(config);
  root.render(<StrictMode><App /></StrictMode>);
}).catch((error: Error) => root.render(<main role="alert"><h1>Ошибка конфигурации</h1><p>{error.message}</p></main>));
