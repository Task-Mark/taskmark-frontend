import { BoardScreen } from "@/components/board/board-screen"

export const dynamic = "force-dynamic"

type HomePageProps = {
  searchParams: Promise<{
    view?: string | string[]
    epic?: string | string[]
    story?: string | string[]
    item?: string | string[]
  }>
}

/** The board is the default view; BoardScreen sends unbound setups to /setup. */
export default async function HomePage({ searchParams }: HomePageProps) {
  return <BoardScreen searchParams={searchParams} />
}
