import { useEffect } from 'react'
import { BottomNav } from './components/BottomNav'
import { ensurePersisted } from './lib/storage'
import { useRoute } from './router'
import { AddItem } from './screens/AddItem'
import { ItemDetail } from './screens/ItemDetail'
import { Settings } from './screens/Settings'
import { Wardrobe } from './screens/Wardrobe'

const NAV_ROUTES = new Set(['/', '/settings'])

export default function App() {
  const route = useRoute()

  useEffect(() => {
    void ensurePersisted()
  }, [])

  const [head, param] = route.segments
  const tab = `/${head ?? ''}`

  let screen
  if (!head) screen = <Wardrobe />
  else if (head === 'add') screen = <AddItem />
  else if (head === 'item' && param) screen = <ItemDetail id={param} />
  else if (head === 'settings') screen = <Settings />
  else screen = <Wardrobe />

  return (
    <div className="min-h-full pb-20">
      {screen}
      {NAV_ROUTES.has(tab) && <BottomNav current={tab} />}
    </div>
  )
}
