# 测试用例库（BDD）

> 每个用例以「步骤驱动」描述：进入页面 → 操作 → 验证 → 再操作 → 再验证。
> 用例编号与 `pages.md` 功能编号对应（如 T-D8 → D8）。

---

## Develop 页面

### T-D8 系统目录选择器

**关联**: D8 系统目录选择器 → `pages.md`

```gherkin
Feature: 系统目录选择器

Scenario: 用户通过目录选择器选择文件夹并回填路径
  Given 我在 Develop 页面
  And   输入框为空
  When  我点击 "Choose Directory" 按钮
  And   系统弹出目录选择器
  And   我选择 "/Users/demo/my-skills" 并确认
  Then  输入框的值变为 "/Users/demo/my-skills"

Scenario: 用户取消目录选择器
  Given 我在 Develop 页面
  And   输入框为空
  When  我点击 "Choose Directory" 按钮
  And   系统弹出目录选择器
  And   我点击取消
  Then  输入框的值仍为空

Scenario: 目录选择器打开失败
  Given 我在 Develop 页面
  When  我点击 "Choose Directory" 按钮
  And   目录选择器抛出异常
  Then  页面弹出 "Failed to open directory picker" 错误提示
```

**测试代码**: `tests/web/develop-page.test.ts`
