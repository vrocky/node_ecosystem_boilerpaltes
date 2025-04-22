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
        <div className="counter">
          <p>Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>Increment</button>
          <button onClick={() => setCount(count - 1)}>Decrement</button>
        </div>
      </main>
    </div>
  );
};

export default App;