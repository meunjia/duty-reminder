export interface WeatherData {
  temp: number
  tempMax: number
  tempMin: number
  weatherCode: number
  windspeed: number
  precipProb: number
  description: string
  icon: string
  outfit: string
  extras: { label: string; color: string }[]
}

export function getWeatherDescription(code: number): { description: string; icon: string } {
  if (code === 0) return { description: '맑음', icon: '☀️' }
  if (code <= 2) return { description: '구름 조금', icon: '🌤️' }
  if (code <= 3) return { description: '흐림', icon: '☁️' }
  if (code <= 49) return { description: '안개', icon: '🌫️' }
  if (code <= 57) return { description: '이슬비', icon: '🌦️' }
  if (code <= 67) return { description: '비', icon: '🌧️' }
  if (code <= 77) return { description: '눈', icon: '❄️' }
  if (code <= 82) return { description: '소나기', icon: '⛈️' }
  if (code <= 99) return { description: '뇌우', icon: '⛈️' }
  return { description: '알 수 없음', icon: '🌡️' }
}

export function getOutfitShort(temp: number): string {
  if (temp >= 28) return '민소매 ok'
  if (temp >= 23) return '반팔 ok'
  if (temp >= 20) return '긴팔 ok'
  if (temp >= 17) return '맨투맨 ok'
  if (temp >= 12) return '자켓 권장'
  if (temp >= 9) return '코트 권장'
  return '패딩 필수'
}

export function getOutfit(temp: number): string {
  if (temp >= 28) return '민소매, 반팔, 반바지, 원피스'
  if (temp >= 23) return '반팔, 얇은 셔츠, 반바지, 면바지'
  if (temp >= 20) return '얇은 가디건, 긴팔, 면바지, 청바지'
  if (temp >= 17) return '얇은 니트, 맨투맨, 가디건, 청바지'
  if (temp >= 12) return '자켓, 가디건, 야상, 청바지, 면바지'
  if (temp >= 9) return '자켓, 트렌치코트, 니트, 청바지, 스타킹'
  if (temp >= 5) return '코트, 가죽 자켓, 히트텍, 니트, 레깅스'
  return '패딩, 두꺼운 코트, 목도리, 기모제품'
}

function makeDay(
  temp: number, tempMax: number, tempMin: number,
  weatherCode: number, windspeed: number, precipProb: number,
): WeatherData {
  const { description, icon } = getWeatherDescription(weatherCode)
  const extras: { label: string; color: string }[] = []
  if (precipProb >= 50) extras.push({ label: `우산 챙기세요 · ${precipProb}%`, color: '#378ADD' })
  if (windspeed >= 7) extras.push({ label: '바람 강함', color: '#888' })
  return { temp, tempMax, tempMin, weatherCode, windspeed, precipProb, description, icon, outfit: getOutfit(temp), extras }
}

export async function fetchWeather(lat: number, lng: number): Promise<{ today: WeatherData; tomorrow: WeatherData }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode,windspeed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max&timezone=Asia%2FSeoul&forecast_days=2`
  const res = await fetch(url)
  if (!res.ok) throw new Error('날씨 API 오류')
  const d = await res.json()

  const today = makeDay(
    Math.round(d.current.temperature_2m),
    Math.round(d.daily.temperature_2m_max[0]),
    Math.round(d.daily.temperature_2m_min[0]),
    d.current.weathercode,
    d.current.windspeed_10m,
    d.daily.precipitation_probability_max[0] ?? 0,
  )

  const tmrAvg = Math.round((d.daily.temperature_2m_max[1] + d.daily.temperature_2m_min[1]) / 2)
  const tomorrow = makeDay(
    tmrAvg,
    Math.round(d.daily.temperature_2m_max[1]),
    Math.round(d.daily.temperature_2m_min[1]),
    d.daily.weathercode[1],
    Math.round(d.daily.windspeed_10m_max?.[1] ?? 0),
    d.daily.precipitation_probability_max[1] ?? 0,
  )

  return { today, tomorrow }
}
