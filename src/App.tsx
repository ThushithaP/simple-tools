import { RouterProvider, useRouter } from './lib/router'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { findToolByPath } from './tools/registry'

function CurrentPage() {
  const { path } = useRouter()
  const tool = findToolByPath(path)
  const Page = tool?.component ?? HomePage
  return (
    <AppShell>
      <Page />
    </AppShell>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <CurrentPage />
    </RouterProvider>
  )
}
