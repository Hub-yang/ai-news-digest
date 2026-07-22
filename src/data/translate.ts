import process from 'node:process'
import { errorMessage, withTimeout } from '../utils/network'

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'
const DEEPL_TARGET_LANG = 'ZH-HANS'
const TRANSLATE_TIMEOUT_MS = 15000

interface DeepLResponse {
  translations: { text: string }[]
}

// 无 DEEPL_API_KEY、超时、非 2xx、网络错误等任何失败都被吞掉并原样返回输入，
// 调用方（fetchSource）不需要关心翻译细节，只需要「要么翻译成功，要么原文回退」。
export async function translateTexts(texts: string[]): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey)
    return texts

  const nonEmpty = texts
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => text.length > 0)

  if (nonEmpty.length === 0)
    return texts

  try {
    const params = new URLSearchParams()
    nonEmpty.forEach(({ text }) => params.append('text', text))
    params.append('target_lang', DEEPL_TARGET_LANG)
    params.append('source_lang', 'EN')

    const response = await withTimeout(
      fetch(DEEPL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }),
      TRANSLATE_TIMEOUT_MS,
    )

    if (!response.ok)
      throw new Error(`DeepL API responded with ${response.status}`)

    const data = await response.json() as DeepLResponse
    const result = [...texts]
    nonEmpty.forEach(({ index }, i) => {
      const translated = data.translations[i]?.text
      if (translated)
        result[index] = translated
    })
    return result
  }
  catch (err) {
    console.warn(`[warn] translation failed, falling back to original text: ${errorMessage(err)}`)
    return texts
  }
}
