
import i18n from '../locales/i18n';
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from './test-providers';
import type { RenderOptions } from '@testing-library/react';

// Asegurar que la i18n está inicializada
if (!i18n.isInitialized)
{
  i18n.init({});
}

// Definimos un render personalizado
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: TestProviders, ...options });

// Exportación explícita para evitar un error de react-refresh
export {
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from '@testing-library/react';

// Exportar el render personalizado
export { customRender as render };
