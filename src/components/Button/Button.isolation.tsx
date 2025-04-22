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

// Render immediately to ensure the component loads
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ButtonIsolation />
    </React.StrictMode>
  );
}

export default ButtonIsolation;
