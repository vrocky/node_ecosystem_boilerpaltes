import React, { createContext, useContext, useState } from 'react';
import ReactDOM from 'react-dom';

// Create a context
const ThemeContext = createContext();

// Theme provider component
function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Header component
function Header() {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <header>
            <h1>Theme Example</h1>
            <button onClick={toggleTheme}>Toggle Theme</button>
            <p>Current Theme: {theme}</p>
        </header>
    );
}

// Content component
function Content() {
    const { theme } = useContext(ThemeContext);

    return (
        <div className={`content ${theme}`}>
            <p>This is some content.</p>
        </div>
    );
}

// Main App component
function App() {
    return (
        <ThemeProvider>
            <div className="App">
                <Header />
                <Content />
            </div>
        </ThemeProvider>
    );
}

// Render the app
ReactDOM.render(<App />, document.getElementById('root'));
