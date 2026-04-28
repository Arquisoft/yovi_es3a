
import './locales/i18n'
import App from './App.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertProvider } from './components/ui/AlertProvider'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import './styles/index.css'

// Montamos la aplicación en el root del DOM
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertProvider>
        <App />
    </AlertProvider>
  </StrictMode>
)
