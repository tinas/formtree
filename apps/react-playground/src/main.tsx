import './style.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'

const container = document.getElementById('app')

if (container != null) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
