import {
  BoardScreen,
  type BoardSearchParams,
} from "@/components/board/board-screen"

export const dynamic = "force-dynamic"

type BoardPageProps = {
  searchParams: Promise<BoardSearchParams>
}

/** Alias of `/` — kept so older links and bookmarks keep working. */
export default async function BoardPage({ searchParams }: BoardPageProps) {
  return <BoardScreen searchParams={await searchParams} />
}
