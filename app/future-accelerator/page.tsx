import { Header } from '@/components/header'
import { Accelerator } from '@/components/fa/accelerator'

export const metadata = {
  title: 'Future Accelerator | humanfirstbykk',
  description: 'Discover your next opportunity in under a minute: tap a few answers, get your best business idea or role, and pitch it in the War Room.',
}

export default function FutureAcceleratorPage() {
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <Header />
      <div className="min-h-0 flex-1">
        <Accelerator mode="page" />
      </div>
    </main>
  )
}
