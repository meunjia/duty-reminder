// Nominatim (무료, 키 불필요) 로 주소 → 좌표 변환
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=kr&limit=1&accept-language=ko`
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'ko', 'User-Agent': 'EuniCalendar/1.0' } })
    const data = await res.json()
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

const TMAP_KEY = 'igdb75ThV77b5Xf65JYJU8wiDzaeVh5T6oF0EVw0'

// Tmap 경로 조회 → 소요 시간(분) 반환
export async function getTmapDuration(params: {
  originLat: number; originLng: number
  destLat: number; destLng: number
  departureTime: string  // HH:MM
}): Promise<number | null> {
  const { originLat, originLng, destLat, destLng, departureTime } = params
  const tmapKey = TMAP_KEY

  const now = new Date()
  const [hh, mm] = departureTime.split(':')
  const dt = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${hh}${mm}`

  try {
    const res = await fetch('https://apis.openapi.sk.com/tmap/routes?version=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', appKey: tmapKey },
      body: JSON.stringify({
        startX: String(originLng), startY: String(originLat),
        endX: String(destLng), endY: String(destLat),
        reqCoordType: 'WGS84GEO', resCoordType: 'WGS84GEO',
        startName: '출발', endName: '도착',
        trafficInfo: 'Y', departureTime: dt,
      }),
    })
    const data = await res.json()
    const sec = data?.features?.[0]?.properties?.totalTime
    return sec ? Math.round(sec / 60) : null
  } catch {
    return null
  }
}
