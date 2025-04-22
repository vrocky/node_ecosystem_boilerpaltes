// Force Vite to apply the JSX transform by using the comment below
/** @jsxRuntime automatic */
/** @jsxImportSource react */
import React from 'react';
import './Button.scss';

// Simple Button props interface
interface ButtonProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
}

// Button component with default props
const Button = ({
  text,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false
}: ButtonProps) => {
  return (
    <button 
      className={`button button--${variant} button--${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default Button;
