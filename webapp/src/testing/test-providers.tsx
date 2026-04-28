
import React from 'react';
import { AlertProvider } from '../components/ui/AlertProvider';

// Componente que envuelve los tests con los providers necesarios
export const TestProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AlertProvider>
      {children}
    </AlertProvider>
  );
};
