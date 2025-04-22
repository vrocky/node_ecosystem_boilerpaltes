import React from 'react';
import './Button.scss';

interface ButtonProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  text,
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false
}) => {
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
