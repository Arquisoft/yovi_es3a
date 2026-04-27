import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AlertProvider } from './components/ui/AlertProvider';
import i18n from './i18n';

// Ensure i18n is initialized before rendering
if (!i18n.isInitialized) {
  i18n.init({});
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AlertProvider>
      {children}
    </AlertProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

