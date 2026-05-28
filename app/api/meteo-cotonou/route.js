import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const WMO_LABELS = {
  0: "Ciel dégagé", 1: "Peu nuageux", 2: "Partiellement nuageux", 3: "Couvert",
  45: "Brouillard", 48: "Brouillard givrant",
  51: "Bruine légère", 53: "Bruine modérée", 55: "Bruine dense",
  61: "Pluie légère", 63: "Pluie modérée", 65: "Pluie forte",
  80: "Averses légères", 81: "Averses modérées", 82: "Averses violentes",
  95: "Orage", 96: "Orage avec grêle", 99: "Orage violent",
}

function wmoIcon(code, rain) {
  if (code === 0) return "☀️"
  if (code <= 2) return "⛅"
  if (code === 3) return "☁️"
  if (code < 51) return "🌫️"
  if (rain < 5) return "🌦️"
  return "🌧️"
}

export async function GET() {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=6.3703&longitude=2.3912" +
      "&daily=precipitation_sum,temperature_2m_max,weathercode" +
      "&timezone=Africa%2FPorto-Novo&forecast_days=14"

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return NextResponse.json({ error: "Open-Meteo indisponible" }, { status: 500 })

    const data = await res.json()
    const times = data.daily?.time || []
    const codes = data.daily?.weathercode || []
    const rains = data.daily?.precipitation_sum || []
    const temps = data.daily?.temperature_2m_max || []

    const days = times.map((date, i) => {
      const code = codes[i] ?? 0
      const rain = rains[i] ?? 0
      const tempMax = temps[i] ?? 30
      const suitable = code <= 3 && rain < 5
      const label = WMO_LABELS[code] ?? "Inconnu"
      const icon = wmoIcon(code, rain)
      const dateFr = new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
        weekday: "short", day: "numeric", month: "short",
      })
      return { date, dateFr, code, rain: Math.round(rain * 10) / 10, tempMax: Math.round(tempMax), suitable, icon, label }
    })

    return NextResponse.json({ days })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
