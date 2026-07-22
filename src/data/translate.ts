import process from 'node:process'
import { errorMessage } from '../utils/network'

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'
const DEEPL_TARGET_LANG = 'ZH-HANS'
const TRANSLATE_TIMEOUT_MS = 15000

interface DeepLResponse {
  translations: { text: string }[]
}

export interface TranslateResult {
  texts: string[]
  /** 是否实际完成了翻译；false 时 texts 就是原样传入的英文，调用方可用它提示读者 */
  translated: boolean
}

// 无 DEEPL_API_KEY、超时、非 2xx、网络错误等任何失败都被吞掉并原样返回输入，
// 调用方（fetchSource）不需要关心翻译细节，只需要「要么翻译成功，要么原文回退」，
// translated 字段则让调用方能把「原文回退」这件事透传给读者（见 App.vue footer）。
export async function translateTexts(texts: string[]): Promise<TranslateResult> {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey)
    return { texts, translated: false }

  const nonEmpty = texts
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => text.length > 0)

  if (nonEmpty.length === 0)
    return { texts, translated: true }

  // withTimeout 只是「谁先完成谁赢」的赛跑，被判超时的 fetch() 本身并不会停止，
  // 底层请求会继续跑到自然结束才被回收。这里改用 AbortController 让超时真正
  // 中止请求，避免在后台空耗网络连接。
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS)

  try {
    const params = new URLSearchParams()
    nonEmpty.forEach(({ text }) => params.append('text', text))
    params.append('target_lang', DEEPL_TARGET_LANG)
    params.append('source_lang', 'EN')

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      signal: controller.signal,
    })

    if (!response.ok)
      throw new Error(`DeepL API responded with ${response.status}`)

    const data = await response.json() as DeepLResponse
    const result = [...texts]
    nonEmpty.forEach(({ index }, i) => {
      const translated = data.translations[i]?.text
      if (translated)
        result[index] = translated
    })
    return { texts: result, translated: true }
  }
  catch (err) {
    console.warn(`[warn] translation failed, falling back to original text: ${errorMessage(err)}`)
    return { texts, translated: false }
  }
  finally {
    clearTimeout(timer)
  }
}
