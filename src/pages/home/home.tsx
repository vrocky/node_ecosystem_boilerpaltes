import React from 'react';
import Button from '../../components/Button/Button';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <header>
        <h1>Welcome to the MPA Rollup Setup</h1>
      </header>
      <main>
        <section className="hero">
          <h2>Multi-Page Application with Component Isolation</h2>
          <p>This example shows how to build a multi-page application with component isolation mode.</p>
          
          <div className="button-group">
            <Button 
              text="View Documentation" 
              variant="primary" 
              onClick={() => window.location.href = '/about'}
            />
            <Button 
              text="View Components" 
              variant="outline" 
              onClick={() => window.location.href = '/isolation'}
            />
          </div>
        </section>
        
        <section className="features">
          <h2>Features</h2>
          <ul>
            <li>Multi-page application structure</li>
            <li>Component isolation mode (like Storybook but simpler)</li>
            <li>Component testing support</li>
            <li>Automatic path resolution</li>
          </ul>
        </section>
      </main>
      <footer>
        <p>Rollup MPA & Component Isolation Example</p>
      </footer>
    </div>
  );
};

export default HomePage;
