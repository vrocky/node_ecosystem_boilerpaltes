/**
 * Type definitions for component-related functionality
 */

declare module 'components' {
  export interface BaseComponentProps {
    className?: string;
    id?: string;
    'data-testid'?: string;
  }
  
  export interface ButtonProps extends BaseComponentProps {
    text: string;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'small' | 'medium' | 'large';
    onClick?: () => void;
    disabled?: boolean;
  }
}
