import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { GoalsProvider } from '@/lib/goals-store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GoalsProvider>
        <App />
      </GoalsProvider>
    </BrowserRouter>
  </StrictMode>,
)
