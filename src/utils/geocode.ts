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

const TMAP_KEY = import.meta.env.VITE_TMAP_KEY as string

// T-Map 경로 조회 → 소요 시간(분) 반환 (실시간 교통 기준)
export async function getTmapDuration(params: {
  originLat: number; originLng: number
  destLat: number; destLng: number
  departureTime: string  // HH:MM (현재는 실시간 교통만 지원, 파라미터 유지)
  departureDate?: Date
}): Promise<number | null> {
  const { originLat, originLng, destLat, destLng } = params

  try {
    const res = await fetch('https://apis.openapi.sk.com/tmap/routes?version=1&format=json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', appKey: TMAP_KEY },
      body: JSON.stringify({
        startX: String(originLng), startY: String(originLat),
        endX: String(destLng), endY: String(destLat),
        trafficInfo: 'Y',
        reqCoordType: 'WGS84GEO', resCoordType: 'WGS84GEO',
        searchOption: '0',
      }),
    })
    const data = await res.json()
    const sec = data?.features?.[0]?.properties?.totalTime
    if (!sec) {
      console.error('[Tmap] 응답 파싱 실패:', JSON.stringify(data).slice(0, 200))
    }
    return sec ? Math.round(sec / 60) : null
  } catch (e) {
    console.error('[Tmap] 요청 실패:', e)
    return null
  }
}
