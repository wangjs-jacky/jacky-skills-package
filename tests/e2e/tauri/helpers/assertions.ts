/**
 * 自定义断言工具
 */

/** 等待元素可见并断言其文本内容包含指定字符串 */
export async function expectTextContaining(
  selector: string,
  text: string,
  timeout = 5000
): Promise<void> {
  const el = await $(selector)
  await el.waitForExist({ timeout })
  const elText = await el.getText()
  expect(elText).toContain(text)
}

/** 等待元素可见并断言其文本内容匹配正则 */
export async function expectTextMatching(
  selector: string,
  pattern: RegExp,
  timeout = 5000
): Promise<void> {
  const el = await $(selector)
  await el.waitForExist({ timeout })
  const elText = await el.getText()
  expect(elText).toMatch(pattern)
}

/** 断言元素存在 */
export async function expectExists(selector: string, timeout = 5000): Promise<void> {
  const el = await $(selector)
  await el.waitForExist({ timeout })
  await expect(el).toBeDisplayed()
}

/** 断言元素不存在 */
export async function expectNotExists(selector: string): Promise<void> {
  const el = await $(selector)
  const exists = await el.isExisting()
  expect(exists).toBe(false)
}
