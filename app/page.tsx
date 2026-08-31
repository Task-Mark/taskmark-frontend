import {
  BoardScreen,
  type BoardSearchParams,
} from "@/components/board/board-screen"

export const dynamic = "force-dynamic"

type HomePageProps = {
  searchParams: Promise<BoardSearchParams>
}

/** The board is the default view; BoardScreen sends unbound setups to /setup. */
export default async function HomePage({ searchParams }: HomePageProps) {
  return <BoardScreen searchParams={await searchParams} />
}
