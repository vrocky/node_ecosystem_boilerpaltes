/**
 * Type definitions for page-related functionality
 */

declare module 'pages' {
  export interface BasePageProps {
    title?: string;
    description?: string;
    className?: string;
  }
  
  export interface PageRoute {
    path: string;
    component: React.ComponentType<any>;
    exact?: boolean;
  }
}
