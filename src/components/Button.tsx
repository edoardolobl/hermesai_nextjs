// src/components/Button.tsx
"use client"; // Good practice for components with event handlers, even if simple

import React from 'react';
import { ptTranslations } from '@/localization/pt'; // Changed path

/**
 * @interface ButtonProps
 * @extends React.ButtonHTMLAttributes<HTMLButtonElement>
 * @description Defines the props for the `Button` component. It extends standard HTML button attributes.
 * @property {React.ReactNode} [children] - The content to be displayed inside the button.
 * @property {'primary' | 'secondary' | 'danger' | 'success'} [variant='primary'] - The visual style of the button.
 *    - `primary`: Main action button style.
 *    - `secondary`: Alternative action button style.
 *    - `danger`: Button style for destructive actions (e.g., delete).
 *    - `success`: Button style for positive actions (e.g., confirm, save).
 * @property {'sm' | 'md' | 'lg'} [size='md'] - The size of the button.
 *    - `sm`: Small size.
 *    - `md`: Medium (default) size.
 *    - `lg`: Large size.
 * @property {boolean} [isLoading=false] - If true, the button will display a loading spinner and be disabled.
 * @property {string} [loadingText='Loading...'] - Text to display next to the spinner when `isLoading` is true. Defaults to a translated "Loading..." string.
 * @property {string} [className] - Additional CSS classes to apply to the button element.
 * @property {() => void} [onClick] - Function to be called when the button is clicked.
 * @property {boolean} [disabled] - If true, the button will be disabled and unclickable.
 * @property {'button' | 'submit' | 'reset'} [type='button'] - The HTML type of the button.
 * @property {string} [aria-label] - Defines a string value that labels the current element for accessibility.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'danger' | 'success'; // Added 'success'
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** If true, displays a loading spinner and disables the button */
  isLoading?: boolean;
  /** Text to display next to the spinner when isLoading is true */
  loadingText?: string;
}

/**
 * @component Button
 * @description A general-purpose, memoized button component that supports different visual variants,
 * sizes, and a loading state. It aims to provide a consistent look and feel for button elements
 * throughout the application.
 *
 * It extends standard HTML button attributes, allowing pass-through of props like `onClick`,
 * `disabled`, `type`, `aria-label`, etc.
 *
 * The component is memoized using `React.memo` for performance optimization, which is beneficial
 * if the parent component frequently re-renders but the button's props (especially `onClick` if
 * wrapped in `useCallback`) remain stable.
 *
 * @example
 * // Primary button
 * <Button variant="primary" onClick={() => console.log('Clicked!')}>
 *   Submit
 * </Button>
 *
 * // Secondary button, small size
 * <Button variant="secondary" size="sm">
 *   Cancel
 * </Button>
 *
 * // Loading state
 * <Button isLoading loadingText="Saving...">
 *   Save
 * </Button>
 *
 * // Disabled button
 * <Button disabled>
 *   Cannot Click
 * </Button>
 *
 * @param {ButtonProps} props - The props for configuring the button.
 * @param {React.ReactNode} props.children - Content to be displayed inside the button.
 * @param {ButtonProps['variant']} [props.variant='primary'] - Visual style: 'primary', 'secondary', 'danger', 'success'.
 * @param {ButtonProps['size']} [props.size='md'] - Size: 'sm', 'md', 'lg'.
 * @param {boolean} [props.isLoading=false] - If true, shows a loading spinner and disables the button.
 * @param {string} [props.loadingText] - Text shown during loading. Defaults to translated "Loading...".
 * @param {string} [props.className] - Additional CSS classes.
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement>} props... - Other standard HTML button attributes.
 * @returns {React.ReactElement} The rendered Button component.
 */
export const Button: React.FC<ButtonProps> = React.memo(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = ptTranslations.button_loading_text_default, // Use translated default
  className = '',
  ...props
}) => {
  const baseStyles = "font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";

  const variantStyles = {
    primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white',
    secondary: 'bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 text-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white', // Added success style
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
      aria-busy={isLoading} // Indicate busy state to assistive technologies
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="status" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
});
Button.displayName = 'Button';
