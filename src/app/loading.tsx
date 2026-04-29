import { Loader } from '@/components/loader'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh]">
      <Loader loading={true}>
        <div />
      </Loader>
    </div>
  )
}
