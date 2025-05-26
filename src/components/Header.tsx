import React from 'react';
import { APP_TITLE } from '@/constants'; // Changed path
import { ptTranslations } from '@/localization/pt'; // Changed path

/**
 * @component Header
 * @description A memoized header component for the application.
 * It currently displays the main application title (imported from `APP_TITLE` in `constants.ts`)
 * and a static subtitle (from `ptTranslations`).
 *
 * The component is memoized using `React.memo` because its content, as currently implemented,
 * is static and does not depend on props or dynamic context.
 *
 * This component does not accept any props.
 * It does not currently consume `AuthContext` for user information or logout functionality.
 *
 * @example
 * <Header />
 *
 * @returns {React.ReactElement} The rendered header element.
 */
export const Header: React.FC = React.memo(() => {
  return (
    <header className="w-full max-w-4xl text-center mb-8">
      <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-pink-500 py-2">
        {APP_TITLE} {/* APP_TITLE is now "Hermes AI" from constants.ts */}
      </h1>
      <p className="text-slate-400 text-md md:text-lg">
        {ptTranslations.header_subtitle}
      </p>
    </header>
  );
});
Header.displayName = 'Header';