const PRODUCT_INFO_BASE_URL = 'http://91.225.193.149/UT/hs/dsservice/'

export type ProductSearchCandidate = {
  id: string
  name: string
}

export type ProductParameter = {
  name: string
  value: string
}

export type ProductRemain = {
  shop: string
  quantity: string
}

export type ProductInfo = {
  id: string
  name: string
  price: string | null
  parameters: ProductParameter[]
  remains: ProductRemain[]
}

type ProductSearchResponse = {
  data?: Array<{ id?: string; guid?: string; name?: string }>
}

type ProductApiResponse = {
  data?: Array<{
    id?: string
    guid?: string
    name?: string
    price?: string | number | null
    remains?: Array<{
      shop?: string | null
      quantity?: string | number | null
    }>
    parameters?: Array<{
      name?: string | null
      value?: string | number | null
    }>
  }>
}

type CityResponse = {
  data?: Array<{
    id?: string | null
    name?: string | null
  }>
}

let cachedCities: Array<{ id: string; name: string }> | null = null

function getAuthHeader() {
  return {
    Authorization: 'Basic 0J/QvtC70YzQt9C+0LLQsNGC0LXQu9GMSFRUUDoxMjM0NTY=',
  }
}

function normalizeText(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
}

async function fetchJson<T>(path: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams(params).toString()
  const url = `${PRODUCT_INFO_BASE_URL}${path}${search ? `?${search}` : ''}`
  const response = await fetch(url, {
    headers: getAuthHeader(),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

async function getCities() {
  if (cachedCities) {
    return cachedCities
  }

  const response = await fetchJson<CityResponse>('getcity/')
  const data = Array.isArray(response.data) ? response.data : []
  cachedCities = data
    .map(item => ({
      id: String(item.id ?? '').trim(),
      name: String(item.name ?? '').trim(),
    }))
    .filter(item => item.id && item.name)

  return cachedCities
}

async function resolveCityCandidates(regionName?: string | null, cityName?: string | null) {
  const targetNames = [regionName, cityName].map(normalizeText).filter(Boolean)
  if (!targetNames.length) {
    return []
  }

  const cities = await getCities()
  const matches = cities
    .filter(city => targetNames.includes(normalizeText(city.name)))
    .map(city => city.id)

  return Array.from(new Set(matches))
}

type RawProduct = NonNullable<ProductApiResponse['data']>[number]

function parseProduct(raw?: RawProduct): ProductInfo | null {
  if (!raw) {
    return null
  }

  const id = String(raw.id ?? raw.guid ?? '').trim()
  const name = String(raw.name ?? '').trim()
  if (!name) {
    return null
  }

  const parameters = Array.isArray(raw.parameters)
    ? raw.parameters
        .map((item: NonNullable<RawProduct['parameters']>[number]) => ({
          name: String(item?.name ?? '').trim(),
          value: String(item?.value ?? '').trim(),
        }))
        .filter(item => item.name && item.value)
    : []

  const remains = Array.isArray(raw.remains)
    ? raw.remains
        .map((item: NonNullable<RawProduct['remains']>[number]) => ({
          shop: String(item?.shop ?? '').trim(),
          quantity: String(item?.quantity ?? '').trim(),
        }))
        .filter(item => item.shop && item.quantity)
    : []

  const priceRaw = raw.price
  const price =
    priceRaw === null || priceRaw === undefined || String(priceRaw).trim() === ''
      ? null
      : String(priceRaw).trim()

  return {
    id,
    name,
    price,
    parameters,
    remains,
  }
}

export async function searchProductsByName(query: string): Promise<ProductSearchCandidate[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return []
  }

  const normalizedQuery = normalizeText(trimmedQuery).replace(/\s+/g, ' ')
  const words = normalizedQuery.split(' ').filter(word => word.length >= 2)
  const variants = Array.from(
    new Set([
      trimmedQuery,
      normalizedQuery,
      ...words,
    ]),
  )

  const deduped = new Map<string, ProductSearchCandidate>()
  let lastError: Error | null = null

  for (const variant of variants) {
    try {
      const response = await fetchJson<ProductSearchResponse>('searchproduct/', {
        nameseatch: variant,
      })

      const data = Array.isArray(response.data) ? response.data : []
      for (const item of data) {
        const candidate = {
          id: String(item.id ?? item.guid ?? '').trim(),
          name: String(item.name ?? '').trim(),
        }
        if (candidate.id && candidate.name && !deduped.has(candidate.id)) {
          deduped.set(candidate.id, candidate)
        }
      }

      if (deduped.size > 0 && words.length <= 1) {
        break
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Search request failed')
    }
  }

  const combinedResults = Array.from(deduped.values())
  if (!combinedResults.length) {
    if (lastError) {
      throw lastError
    }
    return []
  }

  if (words.length > 1) {
    const strictMatches = combinedResults.filter(item => {
      const normalizedName = normalizeText(item.name)
      return words.every(word => normalizedName.includes(word))
    })

    if (strictMatches.length) {
      return strictMatches.sort((left, right) => {
        const leftName = normalizeText(left.name)
        const rightName = normalizeText(right.name)
        const leftStarts = leftName.startsWith(normalizedQuery) ? 1 : 0
        const rightStarts = rightName.startsWith(normalizedQuery) ? 1 : 0

        if (leftStarts !== rightStarts) {
          return rightStarts - leftStarts
        }

        return leftName.length - rightName.length
      })
    }
  }

  return combinedResults
}

async function fetchProductByType(
  type: 'barcode' | 'guid',
  value: string,
  regionName?: string | null,
  cityName?: string | null,
): Promise<ProductInfo | null> {
  const cityCandidates = await resolveCityCandidates(regionName, cityName)
  if (!cityCandidates.length) {
    return null
  }

  for (const cityId of cityCandidates) {
    for (const valueRemain of ['true', 'false'] as const) {
      const response = await fetchJson<ProductApiResponse>('getproduct/', {
        typeget: type,
        data: value,
        valueremain: valueRemain,
        idcity: cityId,
      })

      const product = parseProduct(response.data?.[0])
      if (product) {
        return product
      }
    }
  }

  return null
}

export async function fetchProductByBarcode(
  barcode: string,
  regionName?: string | null,
  cityName?: string | null,
) {
  return fetchProductByType('barcode', barcode, regionName, cityName)
}

export async function fetchProductByGuid(
  guid: string,
  regionName?: string | null,
  cityName?: string | null,
) {
  return fetchProductByType('guid', guid, regionName, cityName)
}
