# 设计文档：失效技能自动清理

## 问题

当技能源路径失效（软链接失效 / 目录删除 / 权限不足）时，`install_skill` 报错但前端无法感知，用户无法通过正常流程清理。

## 方案

**加载时自动清理 + toast 提示**：`list_skills` 遍历注册表 时检测路径有效性，失效的自动清理并返回 `cleanedCount`，前端显示 toast。

## 数据流

```
前端 loadSkills()
    ↓
skillsApi.list()  →  Tauri list_skills
    ↓                       ↓
{ skills, cleanedCount }    遍历 注册表
    ↓                       ├── path 有效 → 保留
显示 toast               └── path 失效 → 清理
```

## 受影响文件（3 个）

### 1. `src-tauri/src/commands/skills.rs`（modify）

新增结构体：

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSkillsResult {
    pub skills: Vec<SkillInfo>,
    pub cleaned_count: u32,
}
```

修改 `list_skills` 函数：

```rust
#[tauri::command]
pub async fn list_skills(state: State<'_, AppState>) -> Result<ListSkillsResult, String> {
    let mut registry = state.registry.lock().map_err(|e| e.to_string())?;
    let all_skills: Vec<SkillInfo> = registry.list_skills();

    let mut valid_skills = Vec::new();
    let mut cleaned_count = 0u32;

    for skill in all_skills {
        let path = Path::new(&skill.path);
        if path.is_dir() {
            valid_skills.push(skill);
        } else {
            // 清理：从环境目录删除安装文件
            if let Some(envs) = &skill.installed_environments {
                for env in envs {
                    if let Ok((_label, env_dir)) = env_path(env) {
                        let target = env_dir.join(&skill.name);
                        let _ = remove_path(&target);
                    }
                }
            }
            // 清理：移除 hooks
            if has_skill_hooks_in_settings(&skill.name) {
                let _ = remove_skill_hooks(&skill.name);
            }
            // 清理：从注册表 注销
            let _ = registry.unregister(&skill.name);
            cleaned_count += 1;
        }
    }

    Ok(ListSkillsResult {
        skills: valid_skills,
        cleaned_count,
    })
}
```

### 2. `packages/web/src/api/client.ts`（modify）

修改 `skillsApi.list()` 返回类型：

```typescript
// 新增接口
export interface ListSkillsResult {
  skills: SkillInfo[]
  cleanedCount: number
}

// 修改 list 方法
async list(): Promise<ApiResponse<ListSkillsResult>> {
  if (isTauriEnv()) {
    return safeTauriInvoke<ListSkillsResult>('list_skills')
  }
  return api.get('skills').json<ApiResponse<ListSkillsResult>>()
}
```

### 3. `packages/web/src/pages/Skills/index.tsx`（modify）

修改 `loadSkills` 适配新结构 + 添加 toast：

```typescript
async function loadSkills() {
  setIsLoading(true)
  try {
    const response = await skillsApi.list()
    if (response.success) {
      const { skills, cleanedCount } = response.data
      setSkills(skills)
      if (cleanedCount > 0) {
        showToast(`Auto-cleaned ${cleanedCount} broken skill(s)`, 'success')
      }
    }
  } catch (err) {
    showToast('Failed to load skills', 'error')
  } finally {
    setIsLoading(false)
  }
}
```

## 不做的事

- 不添加 `pathExists` 字段到 `SkillInfo`
- 不修改 `SkillCard` 组件
- 不新增 Tauri 命令
- 不修改 CLI 端逻辑
