import { readFileSync } from "fs"
import { join } from "path"

export const dynamic = "force-dynamic"

export async function GET() {
  const html = readFileSync(join(process.cwd(), "public", "rh.html"), "utf-8")
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
