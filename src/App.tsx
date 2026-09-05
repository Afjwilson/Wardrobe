import { useEffect } from 'react'
import { BottomNav } from './components/BottomNav'
import { recordFirstLaunch } from './db/meta'
import { ensurePersisted } from './lib/storage'
import { useRoute } from './router'
import { AddItem } from './screens/AddItem'
import { ItemDetail } from './screens/ItemDetail'
import { OutfitBuilder } from './screens/OutfitBuilder'
import { Outfits } from './screens/Outfits'
import { Settings } from './screens/Settings'
import { Suggest } from './screens/Suggest'
import { Wardrobe } from './screens/Wardrobe'

const NAV_ROUTES = new Set(['/', '/outfits', '/suggest', '/settings'])

export default function App() {
  const route = useRoute()

  useEffect(() => {
    void ensurePersisted()
    void recordFirstLaunch()
  }, [])

  const [head, param] = route.segments
  const tab = `/${head ?? ''}`

  let screen
  if (!head) screen = <Wardrobe />
  else if (head === 'add') screen = <AddItem />
  else if (head === 'item' && param) screen = <ItemDetail id={param} />
  else if (head === 'outfits') screen = <Outfits />
  else if (head === 'build')
    screen = (
      <OutfitBuilder
        outfitId={route.query.get('id') ?? undefined}
        presetItemIds={route.query.get('items') ?? undefined}
      />
    )
  else if (head === 'suggest') screen = <Suggest />
  else if (head === 'settings') screen = <Settings />
  else screen = <Wardrobe />

  return (
    <div className="min-h-full pb-20">
      {screen}
      {NAV_ROUTES.has(tab) && <BottomNav current={tab} />}
    </div>
  )
}
