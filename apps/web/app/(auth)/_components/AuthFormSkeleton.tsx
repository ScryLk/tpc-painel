// Skeleton renderizado durante ClerkLoading. O wrapper externo ja tem
// borda, bg, blur e padding. Aqui so o miolo (labels, inputs, botoes).
export const AuthFormSkeleton = () => {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-3 w-20 animate-pulse rounded bg-tpc-elevated" />
      <div className="h-12 w-full animate-pulse rounded-lg bg-tpc-elevated" />
      <div className="h-10 w-full animate-pulse rounded-full bg-tpc-red/30" />
      <div className="my-1 h-px bg-tpc-border" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
        <div className="h-11 w-full animate-pulse rounded-full bg-tpc-elevated" />
      </div>
      <div className="mt-2 h-3 w-32 animate-pulse self-center rounded bg-tpc-elevated" />
    </div>
  )
}
