import { createRoot } from 'react-dom/client';
import React from 'react';
import { MyComp } from './MyComp';

console.log(1);
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<MyComp name="Niklas" />);
}
console.log(2);
