import React, { useState } from 'react';

const App: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header>
        <h1>React TypeScript Rollup App</h1>
      </header>
      <main>
        <p>Welcome to your React TypeScript application bundled with Rollup!</p>
        <p>Using path aliases for clean imports from <code>@/</code> and <code>@components/</code></p>
        <div className="counter">
          <p>Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>Increment</button>
          <button onClick={() => setCount(count - 1)}>Decrement</button>
        </div>
        <div className="link-section">
          <p>
            <a href="/isolation/">View Components in Isolation</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;