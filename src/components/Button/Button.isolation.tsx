import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Button from './Button';
import './Button.scss';

// Isolation wrapper to demonstrate the component with different props
const ButtonIsolation: React.FC = () => {
  const [clickCount, setClickCount] = useState(0);
  
  const handleClick = () => {
    setClickCount(prev => prev + 1);
  };
  
  return (
    <div className="button-isolation">
      <h1>Button Component</h1>
      
      <div className="component-showcase">
        <h3>Variants</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button text="Primary Button" variant="primary" />
          <Button text="Secondary Button" variant="secondary" />
          <Button text="Outline Button" variant="outline" />
        </div>
      </div>
      
      <div className="component-showcase">
        <h3>Sizes</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button text="Small" size="small" />
          <Button text="Medium" size="medium" />
          <Button text="Large" size="large" />
        </div>
      </div>
      
      <div className="component-showcase">
        <h3>Interactive Example</h3>
        <div>
          <p>Click count: {clickCount}</p>
          <Button text="Click Me" onClick={handleClick} />
        </div>
      </div>
      
      <div className="component-showcase">
        <h3>Disabled State</h3>
        <Button text="Disabled Button" disabled={true} />
      </div>
    </div>
  );
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Safely access import.meta.env with proper type checking
const getEnvValue = (key: string): boolean => {
  if (typeof import.meta !== 'undefined' && 
      typeof import.meta.env !== 'undefined') {
    return (import.meta.env as any)[key] === true;
  }
  return false;
};

// Detect if we're in a module context
// For Vite: check the VITE_MODULE_MODE flag
// For other environments: assume we want to render
const shouldRender = isBrowser && 
  !getEnvValue('VITE_MODULE_MODE');

// Render the component if we're not in a module context
if (shouldRender) {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <ButtonIsolation />
      </React.StrictMode>
    );
  }
}

export default ButtonIsolation;
