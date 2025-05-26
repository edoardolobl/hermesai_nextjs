
import React from 'react';
import { ptTranslations } from '@/localization/pt'; // Changed path

/**
 * @component Footer
 * @description A simple, memoized footer component for the application.
 * It displays copyright information, including the current year, using localized text.
 * The component is memoized using `React.memo` because its content is generally static
 * or changes predictably (like the year), making it a good candidate for performance optimization
 * by preventing unnecessary re-renders.
 *
 * This component does not accept any props.
 *
 * @example
 * <Footer />
 *
 * @returns {React.ReactElement} The rendered footer element.
 */
export const Footer: React.FC = React.memo(() => {
  return (
    <footer className="w-full max-w-4xl text-center mt-8 py-4 border-t border-slate-700">
      <p className="text-sm text-slate-500">
        {ptTranslations.footer_copyright(new Date().getFullYear())}
      </p>
    </footer>
  );
});
Footer.displayName = 'Footer';
